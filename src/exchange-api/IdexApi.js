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

// Matches IDEX API Response structure
type Response = { data: any | OrderBookResponseData };

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
  address?: string,
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
const ETH_TOKEN_ADDR: string = "0x0000000000000000000000000000000000000000";

// See IDEX API Docs (https://github.com/AuroraDAO/idex-api-docs) for info.
function callIdex(method: string, args: IDEX_API_ARG): Promise<Response> {
  return Axios.post("https://api.idex.market/" + method, args);
}

// Returns a list of all tokens on IDEX.
function getCurrencies() {
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

function getBalances(address: string) {
  return callIdex("returnBalances", TO_ADDRESS_ARG(address)).then(
    response => response.data
  );
}

/* IDEX Contract API calls. These involve some form of mutation operation. */

// This is the IDEX Contract address used for doing deposits, withdrawals, trades.
function getIdexContractAddress() {
  return callIdex("returnContractAddress", NO_ARG).then(
    response => response.data.address
  );
}

function getNextNonce(address: string): number {
  return callIdex("returnNextNonce", TO_ADDRESS_ARG(address)).then(response =>
    parseInt(response.data.nonce)
  );
}

// Post an order
async function postOrder(
  contractAddr: string,
  tokenBuyAddr: string,
  amountBuy: string,
  tokenSellAddr: string,
  amountSell: string,
  nonce: number,
  walletAddr: string
) {
  const raw = soliditySha3(
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
      v: /* expires */ 0
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
  let pkey = Buffer.from(
    "6018F909C115DEFF1B767C56AAE1846AD6EB770FB14323BC7AFE2895E564F47C",
    "hex"
  );
  const salted = hashPersonalMessage(toBuffer(raw));
  const { v, r, s } = mapValues(
    ecsign(salted, pkey),
    (value, key) => (key === "v" ? value : bufferToHex(value))
  );
  try {
    const lol = await callIdex("order", {
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
  } catch (error) {
    console.log("error: " + JSON.stringify(error.response.data));
  }
}

async function postBuyOrder(
  tokenTicker: string,
  price: number,
  amount: number
) {
  let sellQuantity = price * amount;
  //let amountBuy =
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
demo();
