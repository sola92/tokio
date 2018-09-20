//@flow
import Axios from "axios";
import { soliditySha3 } from "web3-utils";
import {
  hashPersonalMessage,
  bufferToHex,
  toBuffer,
  ecsign
} from "ethereumjs-util";
import { mapValues } from "lodash";
import { BigNumber } from "bignumber.js";

import EthKey from "../pkey-service/EthKey";
import CannotFillOrderError from "./errors";

// General IDEX Response structure.
type Response = {
  data: any
};

// Single entry in IDEX OrderBook. Can be used for either Asks or Bids.
type OrderBook = {
  // Read API args
  price: string,
  amount: string,
  orderHash: string,
  // Post API args
  tokenBuy: string,
  amountBuy: string,
  tokenSell: string,
  amountSell: string,
  address: string,
  nonce: number,
  expires: number,
  v: number,
  r: string,
  s: string
};

export type OrderType = "buy" | "sell";
export type OrderPrice = {
  totalPrice: BigNumber,
  type: OrderType,
  orders: Array<OrderBook>
};

type IDEX_API_ARG = {
  address?: EthAddress,
  market?: string
};
const NO_ARG = {};
const TO_ADDRESS_ARG = (addr: string): IDEX_API_ARG => ({
  address: addr
});
const TO_MARKET_ARG = (ticker: string): IDEX_API_ARG => ({
  market: "ETH_" + ticker.toUpperCase()
});

const FEE_RATIO: number = 0.03;
const ETH_TOKEN_ADDR: EthAddress = "0x0000000000000000000000000000000000000000";

// See IDEX API Docs (https://github.com/AuroraDAO/idex-api-docs) for info.
function callIdex(method: string, args: any): Promise<Response> {
  console.log(JSON.stringify(args));
  return Axios.post("https://api.idex.market/" + method, args);
}

// Returns a list of all tokens on IDEX.
export function getCurrencies() {
  return callIdex("returnCurrencies", NO_ARG).then(
    (response: Response) => response.data
  );
}

async function getTickerInfo(ticker: string) {
  return callIdex("returnTicker", TO_MARKET_ARG(ticker)).then(
    (response: Response) => response.data
  );
}

export function getAsksOrderBook(ticker: string): Promise<Array<OrderBook>> {
  return callIdex("returnOrderBook", TO_MARKET_ARG(ticker)).then(
    (response: Response) => response.data.asks
  );
}

export async function getOrdersForAmount(
  amount: number,
  ticker: string,
  checkOnly: boolean = false
): Promise<OrderPrice> {
  let asks: Array<OrderBook> = await getAsksOrderBook(ticker);
  let remainingAmount = BigNumber(amount);
  let totalPrice = BigNumber(0);
  let i = 0;
  for (i = 0; i < asks.length && remainingAmount.isGreaterThan(0); i++) {
    let filledAmount = BigNumber.minimum(asks[i].amount, remainingAmount);
    totalPrice = totalPrice.plus(filledAmount.multipliedBy(asks[i].price));
    remainingAmount = remainingAmount.minus(filledAmount);
  }

  if (remainingAmount.isGreaterThan(0)) {
    throw new CannotFillOrderError(
      ticker,
      /* exchange */ "IDEX",
      /* fillableAmount */ BigNumber(amount).minus(remainingAmount),
      /* requestedAmount */ BigNumber(amount),
      checkOnly
    );
  }
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
    type: "buy",
    orders: asks.slice(0, i)
  };
  orderPrice.totalPrice = totalPrice;
  orderPrice.type = "buy";
  orderPrice.orders = asks.slice(0, i);
  return orderPrice;
}

// Returns amount of ETH required to purchase 'amount' of 'ticker' token.
// Includes exchange fee.
export async function getPriceForAmount(ticker: string, amount: number) {
  const orderPrice: OrderPrice = await getOrdersForAmount(
    amount,
    ticker,
    /* checkOnly */ true
  );
  return orderPrice.totalPrice.multipliedBy(1 + FEE_RATIO);
}

function getBalances(address: EthAddress) {
  return callIdex("returnBalances", TO_ADDRESS_ARG(address)).then(
    response => response.data
  );
}

function getOpenOrders(address: EthAddress) {
  return callIdex("returnOpenOrders", TO_ADDRESS_ARG(address)).then(
    response => response.data
  );
}

/* IDEX Contract API calls. These involve some form of mutation operation. */

// This is the IDEX Contract address used for doing deposits, withdrawals, trades.
export function getIdexContractAddress() {
  return callIdex("returnContractAddress", NO_ARG).then(
    response => response.data.address
  );
}

export function getNextNonce(address: EthAddress) {
  return callIdex("returnNextNonce", TO_ADDRESS_ARG(address)).then(response =>
    parseInt(response.data.nonce)
  );
}

// Post an order
export async function postOrder(
  contractAddr: string,
  tokenBuyAddr: string,
  amountBuy: string,
  tokenSellAddr: string,
  amountSell: string,
  nonce: number,
  walletAddr: string
) {
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
      v: amountBuy
    },
    {
      t: "address",
      v: tokenSellAddr
    },
    {
      t: "uint256",
      v: amountSell
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
  try {
    let postOrderResponse = await callIdex("order", {
      tokenBuy: tokenBuyAddr,
      amountBuy: amountBuy,
      tokenSell: tokenSellAddr,
      amountSell: amountSell,
      address: walletAddr,
      nonce: nonce,
      expires: 0,
      v: v,
      r: r,
      s: s
    });
    return postOrderResponse;
  } catch (error) {
    console.log("error posting order to IDEX: " + error.response.data.error);
  }
}

export async function trade(
  orders: Array<OrderBook>,
  amount: string,
  walletAddr: string,
  nonce: number
) {
  const pkey = new EthKey();
  const trades = [];
  let remainingAmount = BigNumber(amount);
  for (var i = 0; i < orders.length; i++) {
    const singleTradeFillAmount = BigNumber.minimum(
      remainingAmount,
      orders[i].amount
    );
    const rawHash: string = soliditySha3(
      {
        t: "uint256",
        v: orders[i].orderHash
      },
      {
        t: "uint256",
        v: singleTradeFillAmount.toFixed()
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
    const { v, r, s } = pkey.sign(rawHash);
    trades.push({
      orderHash: orders[i].orderHash,
      amount: singleTradeFillAmount.toFixed(),
      address: walletAddr,
      nonce: nonce,
      v: v,
      r: r,
      s: s
    });
    remainingAmount = remainingAmount.minus(singleTradeFillAmount);

    if (remainingAmount.isLessThan(0)) {
      throw new Error(
        "Unexpected: remainingAmount=" + remainingAmount.toFixed() + " < 0"
      );
    }
  }
  try {
    let tradeResponse = await callIdex("trade", trades);
    return tradeResponse;
  } catch (error) {
    console.log("error calling trade() on IDEX: " + error.response.data.error);
    throw error;
  }
}
