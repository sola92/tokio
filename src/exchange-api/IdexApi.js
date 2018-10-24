//@flow
const util = require("util");
import web3 from "web3";
import Axios from "axios";
import winston from "winston";
import { soliditySha3 } from "web3-utils";
import {
  hashPersonalMessage,
  bufferToHex,
  toBuffer,
  ecsign
} from "ethereumjs-util";
import { mapValues } from "lodash";
import { BigNumber } from "bignumber.js";
import { toContractPrecision } from "../lib/ethereum/ethutil";

import EthKey from "../pkey-service/EthKey";
import { CannotFillOrderError } from "./errors";

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

// General IDEX Response structure.
type Response = {
  data: ?any,
  error: ?any
};

type TickerInfo = {
  last: string,
  high: string,
  low: string,
  lowestAsk: string,
  highestBid: string,
  percentChange: string,
  baseVolume: string,
  quoteVolume: string
};

// Single entry in IDEX OrderBook. Can be used for either Asks or Bids.
type Order = {
  price: string,
  amount: string,
  // amountBuy represents amount (in wei/decimals) required to fill the order.
  amountBuy: string,
  type: OrderType,
  orderHash: string
};

export type OrderType = "buy" | "sell";
export type OrderPrice = {
  totalPrice: BigNumber,
  type: OrderType,
  orders: Array<Order>
};

export type CurrencyInfo = {
  name: string,
  decimals: number,
  address: EthAddress
};

export const CODE = 1;
export const NAME = "IDEX";

const TO_ETH_MARKET = (ticker: string) => "ETH_" + ticker.toUpperCase();
const DEFAULT_QUERY_COUNT = 100;

const FEE_RATIO: number = 0.03;
const ETH_TOKEN_ADDR: EthAddress = "0x0000000000000000000000000000000000000000";

// See IDEX API Docs (https://github.com/AuroraDAO/idex-api-docs) for info.
function callIdex(method: string, args: any) {
  logger.log(
    "info",
    "Calling IDEX API /" + method + " with args: " + JSON.stringify(args)
  );
  return Axios.post("https://api.idex.market/" + method, args);
}

// Returns a list of all tokens on IDEX.
export function getCurrencies(): Promise<{ [ticker: string]: CurrencyInfo }> {
  return callIdex("returnCurrencies", /* args */ {}).then(
    response => response.data
  );
}

export function getTickerInfo(ticker: string): Promise<TickerInfo> {
  return callIdex("returnTicker", {
    market: TO_ETH_MARKET(ticker)
  }).then(response => response.data);
}

export function getOrderBook(
  ticker: string,
  type: OrderType
): Promise<Array<Order>> {
  return callIdex("returnOrderBook", {
    market: TO_ETH_MARKET(ticker),
    count: DEFAULT_QUERY_COUNT
  }).then(
    response => (type === "buy" ? response.data.asks : response.data.bids)
  );
}

// Returns OrderPrice which has the minimum orders to satisfy the desired amount
// and contains the total price (excluding exchange fees).
export async function getOrdersForAmount(
  amount: string,
  ticker: string,
  type: OrderType
): Promise<OrderPrice> {
  let remainingAmount = BigNumber(amount);
  if (remainingAmount.isLessThan(0)) {
    throw new Error("amount=" + amount + " is < 0.");
  }
  const asks: Array<Order> = await getOrderBook(ticker, type);
  let totalPrice = BigNumber(0);
  let i = 0;
  for (i = 0; i < asks.length && remainingAmount.isGreaterThan(0); i++) {
    const filledAmount = BigNumber.minimum(asks[i].amount, remainingAmount);
    totalPrice = totalPrice.plus(filledAmount.multipliedBy(asks[i].price));
    remainingAmount = remainingAmount.minus(filledAmount);
  }

  if (remainingAmount.isGreaterThan(0)) {
    throw new CannotFillOrderError({
      ticker: ticker,
      exchange: "IDEX",
      fillableAmount: BigNumber(amount)
        .minus(remainingAmount)
        .toFixed(),
      requestedAmount: amount
    });
  }
  // sanity check.
  if (remainingAmount.isLessThan(0)) {
    throw new Error(
      "Unexpected: remainingAmount=" +
        remainingAmount.toFixed() +
        ", requestedAmount=" +
        amount
    );
  }

  // Return first i orders that can be used to fill the buy.
  const orderPrice: OrderPrice = {
    totalPrice: totalPrice,
    type: type,
    orders: asks.slice(0, i)
  };
  return orderPrice;
}

// Returns amount of ETH required to purchase 'amount' of 'ticker' token.
// Includes exchange fee.
export async function getPriceForAmount(
  ticker: string,
  amount: string,
  orderType: OrderType
): Promise<string> {
  if (BigNumber(amount).isLessThan(0)) {
    throw new Error("Unexpected: amount=" + amount + " is < 0");
  }
  const orderPrice: OrderPrice = await getOrdersForAmount(
    amount,
    ticker,
    orderType
  );
  return orderPrice.totalPrice.multipliedBy(1 + FEE_RATIO).toFixed();
}

export function getBalances(
  address: EthAddress
): Promise<{ [ticker: string]: string }> {
  return callIdex("returnBalances", /* args */ { address: address }).then(
    response => response.data
  );
}

export function getOpenOrders(address: EthAddress): Promise<Array<Order>> {
  return callIdex("returnOpenOrders", /* args */ { address: address }).then(
    response => response.data
  );
}

export function getNextNonce(address: EthAddress): Promise<number> {
  return callIdex("returnNextNonce", /* args */ { address: address }).then(
    response => parseInt(response.data.nonce)
  );
}

/* IDEX Contract API calls. These involve some form of mutation operation. */

// This is the IDEX Contract address used for doing deposits, withdrawals, trades.
export function getIdexContractAddress(): Promise<EthAddress> {
  return callIdex("returnContractAddress", /* args */ {}).then(
    response => response.data.address
  );
}

// Withdraw token from the IDEX contract into wallet.
// IDEX enforces a minimum withdrawal amount of 0.04 ETH.
// Returns the response from IDEX.
// https://github.com/AuroraDAO/idex-api-docs#withdraw
export async function withdraw({
  contractAddr,
  amount,
  tokenCurrencyInfo,
  nonce,
  walletAddr
}: {
  contractAddr: string,
  amount: string,
  tokenCurrencyInfo: CurrencyInfo,
  nonce: number,
  walletAddr: string
}) {
  const amountDecimals = toContractPrecision(
    BigNumber(amount),
    tokenCurrencyInfo.decimals
  ).toFixed();
  // Hash and then sign values
  const rawHash: string = soliditySha3(
    {
      t: "address",
      v: contractAddr
    },
    {
      t: "address",
      v: tokenCurrencyInfo.address
    },
    {
      t: "uint256",
      v: amountDecimals
    },
    {
      t: "address",
      v: walletAddr
    },
    {
      t: "uint256",
      v: nonce
    }
  );
  const { v, r, s } = new EthKey().sign(rawHash);
  return await callIdex("withdraw", {
    amount: amountDecimals,
    token: tokenCurrencyInfo.address,
    address: walletAddr,
    nonce: nonce,
    v: v,
    r: r,
    s: s
  });
}

// Post an order.
// Returns the response from IDEX.
// https://github.com/AuroraDAO/idex-api-docs#order
export async function postOrder({
  contractAddr,
  tokenBuyAddr,
  amountBuyDecimals,
  tokenSellAddr,
  amountSellDecimals,
  nonce,
  walletAddr
}: {
  contractAddr: string,
  tokenBuyAddr: string,
  amountBuyDecimals: string,
  tokenSellAddr: string,
  amountSellDecimals: string,
  nonce: number,
  walletAddr: string
}) {
  // Hash and then sign values
  const rawHash: string = soliditySha3(
    {
      t: "address",
      v: contractAddr
    },
    {
      t: "address",
      v: tokenBuyAddr
    },
    {
      t: "uint256",
      v: amountBuyDecimals
    },
    {
      t: "address",
      v: tokenSellAddr
    },
    {
      t: "uint256",
      v: amountSellDecimals
    },
    {
      t: "uint256",
      v: /* expires */ "0"
    },
    {
      t: "uint256",
      v: nonce
    },
    {
      t: "address",
      v: walletAddr
    }
  );
  const { v, r, s } = new EthKey().sign(rawHash);
  return await callIdex("order", {
    tokenBuy: tokenBuyAddr,
    amountBuy: amountBuyDecimals,
    tokenSell: tokenSellAddr,
    amountSell: amountSellDecimals,
    address: walletAddr,
    nonce: nonce,
    expires: 0,
    v: v,
    r: r,
    s: s
  });
}

// Fill an order.
// The amountFill (amountSell) is the amount of tokenBuy to fill for the order.
// It is NOT the amount of token to receive after filling the order.
// Returns the response from IDEX.
// https://github.com/AuroraDAO/idex-api-docs#trade
export async function trade({
  orders,
  amountBuy,
  tokenFillDecimals,
  expectedAmountFill,
  walletAddr,
  nonce
}: {
  orders: Array<Order>,
  amountBuy: string,
  tokenFillDecimals: number,
  expectedAmountFill: string,
  walletAddr: string,
  nonce: number
}) {
  const pkey = new EthKey();
  const trades = [];
  const decimalsMultiplier = BigNumber(10).pow(tokenFillDecimals);
  let remainingAmountBuy = BigNumber(amountBuy);
  let totalAmountFillDecimals = BigNumber(0);
  for (var i = 0; i < orders.length; i++) {
    const singleTradeAmountBuy = BigNumber.minimum(
      remainingAmountBuy,
      orders[i].amount
    );
    const singleTradeAmountBuyDecimals = singleTradeAmountBuy.multipliedBy(
      decimalsMultiplier
    );
    const singleTradeAmountFillDecimals = singleTradeAmountBuyDecimals
      .multipliedBy(orders[i].price)
      .integerValue(BigNumber.ROUND_DOWN);

    const rawHash: string = soliditySha3(
      {
        t: "uint256",
        v: orders[i].orderHash
      },
      {
        t: "uint256",
        v: singleTradeAmountFillDecimals.toFixed()
      },
      {
        t: "address",
        v: walletAddr
      },
      {
        t: "uint256",
        v: nonce + i
      }
    );
    const { v, r, s } = pkey.sign(rawHash);
    trades.push({
      orderHash: orders[i].orderHash,
      amount: singleTradeAmountFillDecimals.toFixed(),
      address: walletAddr,
      nonce: nonce + i,
      v: v,
      r: r,
      s: s
    });
    remainingAmountBuy = remainingAmountBuy.minus(singleTradeAmountBuy);
    totalAmountFillDecimals = totalAmountFillDecimals.plus(
      singleTradeAmountFillDecimals
    );

    if (remainingAmountBuy.isLessThan(0)) {
      throw new Error(
        "Unexpected: remainingAmount=" + remainingAmountBuy.toFixed() + " < 0"
      );
    }
  }
  // Sanity check that the amount we are filling with is <= the provided
  // expected amount.
  if (
    totalAmountFillDecimals.isGreaterThan(
      decimalsMultiplier.multipliedBy(expectedAmountFill)
    )
  ) {
    throw new Error(
      "Unexpected: totalAmountFillDecimals=" +
        totalAmountFillDecimals.toFixed() +
        " > expectedAmountFillDecimals=" +
        decimalsMultiplier.multipliedBy(expectedAmountFill).toFixed()
    );
  }
  return await callIdex("trade", trades);
}
