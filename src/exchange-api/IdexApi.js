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
import util from "util";

import EthKey from "../pkey-service/EthKey";
import IdexClient from "./IdexClient";

// Matches IDEX API Response structure
type Response = {
  data: any | OrderBookResponseData
};

// Single entry in IDEX OrderBook. Can be used for either Asks or Bids.
type OrderBook = {
  // Read API args
  price: number,
  amount: number,
  // Post API args
  tokenBuy: string,
  amountBuy: number,
  tokenSell: string,
  amountSell: number,
  address: string,
  nonce: number,
  expires: number,
  v: number,
  r: string,
  s: string
};
type OrderBookResponseData = {
  asks: Array<OrderBook>
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
function callIdex(method: string, args: IDEX_API_ARG): Promise<Response> {
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

function getAsksOrderBook(ticker: string): Promise<Array<OrderBook>> {
  return callIdex("returnOrderBook", TO_MARKET_ARG(ticker)).then(
    (response: Response) => response.data.asks
  );
}

// Returns amount of ETH required to purchase 'amount' of 'ticker' token.
// Does not include exchange fee.
function determineOrderBookPrice(
  amount: number,
  asks: Array<OrderBook>
): number {
  let remainingAmount = BigNumber(amount);
  let totalPrice = BigNumber(0);
  for (let i = 0; i < asks.length && remainingAmount.isGreaterThan(0); i++) {
    let fillableAmount = BigNumber.minimum(asks[i].amount, remainingAmount);
    totalPrice = totalPrice.plus(fillableAmount.multipliedBy(asks[i].price));
    remainingAmount = remainingAmount.minus(fillableAmount);
  }
  return totalPrice.toNumber();
}

// Returns amount of ETH required to purchase 'amount' of 'ticker' token.
// Includes exchange fee.
async function getPriceForAmount(ticker: string, amount: number) {
  let asks: Array<OrderBook> = await getAsksOrderBook(ticker);
  let price = determineOrderBookPrice(amount, asks);
  return price * (1 + FEE_RATIO);
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
  // $FlowFixMe
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
    console.log("error: " + util.inspect(error.response.data));
  }
}

async function demo() {
  let linkPrice = await getPriceForAmount("link", 10000);
  console.log("10000 link costs " + linkPrice + " ETH");
  let balance = await getBalances("0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499");
  console.log("current balance: " + JSON.stringify(balance));
  let contractAddr = await getIdexContractAddress();
  console.log("contractAddr: " + contractAddr);
  let linkContractAddr = "0x514910771af9ca656af840dff83e8264ecf986ca";
  let nextNonce = await getNextNonce(
    "0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499"
  );
  let postOrderResult = await postOrder(
    contractAddr,
    linkContractAddr,
    "2923366585636809477",
    ETH_TOKEN_ADDR,
    "400000000000000000",
    nextNonce,
    "0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499"
  );
}
async function idexClientDemo() {
  let a = new IdexClient("0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499");
  let oo = await getOpenOrders("0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499");
  console.log(oo);
  try {
    let b = await a.postBuyOrder("LINK", "0.00000029", "517242");
    console.log("postbuyORder Resposne: " + util.inspect(b));
  } catch (error) {
    console.log("error: " + util.inspect(error.response.data));
  }
}
//demo();
idexClientDemo();
