//@flow
import Axios from "axios";
import { soliditySha3 } from "web3-utils";
import { hashPersonalMessage, bufferToHex, toBuffer, ecsign } from "ethereumjs-util";
import { mapValues } from "lodash";
import { BigNumber } from "bignumber.js";

// Matches IDEX API Response structure
type Response = { data: any | OrderBookResponseData }

// Single entry in IDEX OrderBook. Can be used for either Asks or Bids.
type OrderBook = {
  price: number,
  amount: number,
}
type OrderBookResponseData = {
  asks: Array<OrderBook>
}

type IDEX_API_ARG = {
  address?: string,
  market?: string
};
const NO_ARG = {};
const TO_ADDRESS_ARG = (addr: string): IDEX_API_ARG => ({
  address: addr
});
const TO_MARKET_ARG = (ticker: string): IDEX_API_ARG => ({
  market: 'ETH_' + ticker.toUpperCase()
});

const FEE_RATIO: number = 0.03;
const ETH_TOKEN_ADDR: string = '0x0000000000000000000000000000000000000000';

// See IDEX API Docs (https://github.com/AuroraDAO/idex-api-docs) for info.
async function callIdex(method: string, args: IDEX_API_ARG): Promise<Response> {
  return Axios.post('https://api.idex.market/' + method, args);
}

// Returns a list of all tokens on IDEX.
async function getCurrencies() {
  return callIdex('returnCurrencies', NO_ARG).then((response: Response) => response.data);
}

async function gettTickerInf(ticker: string) {
  return callIdex('returnTicker', TO_MARKET_ARG(ticker)).then((response: Response) => response.data);
}

async function getAsksOrderBook(ticker: string): Promise<Array<OrderBook>> {
  return callIdex('returnOrderBook', TO_MARKET_ARG(ticker)).then((response: Response) => response.data.asks);
}

// Returns amount of ETH required to purchase 'amount' of 'ticker' token.
// Does not include exchange fee.
function determineOrderBookPrice(amount: number, asks: Array<OrderBook>): number {
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

async function getBalance(address: string) {
  return callIdex('returnOrderBook', TO_ADDRESS_ARG(address)).then(response => response.data);
}

// This is the IDEX Contract address used for doing deposits, withdrawals, trades.
function getContractAddress(address: string) {
  return callIdex('returnContractAddress', TO_ADDRESS_ARG(address)).then(response => response.data);
}

async function demo() {
  let linkPrice = await getPriceForAmount('link', 10000);
  console.log('10000 link costs ' + linkPrice + ' ETH');
}
demo();
