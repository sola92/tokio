//@flow
const util = require("util");
import web3 from "web3";
import EthereumTx from "ethereumjs-tx";
import fs from "fs";
import Web3Session from "../lib/ethereum/Web3Session";
import EthKey from "../pkey-service/EthKey";
import {
  getOrdersForAmount,
  getCurrencies,
  getIdexContractAddress,
  getNextNonce,
  postOrder,
  trade,
  withdraw
} from "./IdexApi";
import { TotalPriceIncreasedError } from "./errors";
import { BigNumber } from "bignumber.js";
import { toContractPrecision } from "../lib/ethereum/ethutil";
import type { TransactionReceipt } from "../lib/ethereum/typedef";

import type { OrderPrice, OrderType, CurrencyInfo } from "./IdexApi";

const ETH_DECIMALS_MULTIPLIER = "1000000000000000000";
const ETH_PRECISION = 18;
const ETH_TOKEN_ADDRESS: EthAddress =
  "0x0000000000000000000000000000000000000000";
const UNINITIALIZED_NONCE = -1;

// Dictionary of all tokens on IDEX. Retrieved from IDEX.
let CURRENCIES = {};
async function getCurrencyInfo(ticker: string): Promise<CurrencyInfo> {
  let currencyInfo = CURRENCIES[ticker];
  if (currencyInfo == null) {
    CURRENCIES = await getCurrencies();
    if (CURRENCIES[ticker] == null) {
      throw new Error("IDEX doesn't have CurrencyInfo for ticker " + ticker);
    }
    currencyInfo = CURRENCIES[ticker];
  }
  return currencyInfo;
}

let WEB3_SESSION: ?Web3Session;
async function getWeb3Session(): Promise<Web3Session> {
  if (!WEB3_SESSION) {
    WEB3_SESSION = Web3Session.createSession();
  }
  return WEB3_SESSION;
}

// This isn't expected to change once initialized.
let IDEX_CONTRACT_ADDRESS: Promise<EthAddress>;
async function getIdexContractAddr() {
  if (IDEX_CONTRACT_ADDRESS == null) {
    IDEX_CONTRACT_ADDRESS = await getIdexContractAddress();
  }
  return IDEX_CONTRACT_ADDRESS;
}

let IDEX_ABI: string;
function getIdexAbi() {
  if (IDEX_ABI == null) {
    IDEX_ABI = JSON.parse(
      fs.readFileSync("./src/exchange-api/idex_abi.json", "utf8")
    );
  }
  return IDEX_ABI;
}

let IDEX_CONTRACT_INSTANCE;
async function getIdexContractInstance() {
  if (!IDEX_CONTRACT_INSTANCE) {
    IDEX_CONTRACT_INSTANCE = (await getWeb3Session()).createContractInstance(
      getIdexAbi(),
      await getIdexContractAddr()
    );
  }
  return IDEX_CONTRACT_INSTANCE;
}

let IDEX_DEPOSIT_ABI;
async function getIdexDepositAbi() {
  if (!IDEX_DEPOSIT_ABI) {
    IDEX_DEPOSIT_ABI = (await getIdexContractInstance()).methods
      .deposit()
      .encodeABI();
  }
  return IDEX_DEPOSIT_ABI;
}

let IDEX_DEPOSIT_TOKEN_ABI;
async function getIdexDepositTokenAbi() {
  if (!IDEX_DEPOSIT_TOKEN_ABI) {
    IDEX_DEPOSIT_TOKEN_ABI = (await getIdexContractInstance()).methods
      .depositToken()
      .encodeABI();
  }
  return IDEX_DEPOSIT_TOKEN_ABI;
}

export default class IdexClient {
  ethWalletAddress: EthAddress;

  // Current assumed Nonce for interacting with Idex contract.
  // Initial value is -1.
  nonce: number;

  idexContract: web3.eth.Contract;

  ethKey: EthKey;

  constructor(ethWalletAddress: EthAddress) {
    this.ethWalletAddress = ethWalletAddress;
    this.nonce = UNINITIALIZED_NONCE;
    this.ethKey = new EthKey();
  }

  async depositEth(amount: string) {
    const amountWei = web3.utils.toWei(amount, "ether");
    const gasRequired = await (await getIdexContractInstance()).methods
      .deposit()
      .estimateGas({ from: this.ethWalletAddress, value: amountWei });

    const web3Session = await getWeb3Session();
    const tx = new EthereumTx({
      from: this.ethWalletAddress,
      to: await getIdexContractAddress(),
      data: await getIdexDepositAbi(),
      value: web3Session.toHex(amountWei),
      nonce: web3Session.toHex(
        await web3Session.getNonce(this.ethWalletAddress)
      ),
      gasPrice: web3Session.toHex(await web3Session.getGasPriceWei()),
      gasLimit: web3Session.toHex(gasRequired),
      chainId: web3Session.toHex(await web3Session.getChainId())
    });
    this.ethKey.signTransaction(tx);
    try {
      const txReceipt: TransactionReceipt = await web3Session.sendSignedTransaction(
        tx
      );
      console.log("got depositEth txReceipt: " + util.inspect(txReceipt));
    } catch (error) {
      console.log("error sending deposit tx: " + util.inspect(error));
    }
  }

  async getNonce(forceFetch: boolean = false): Promise<number> {
    if (this.nonce == UNINITIALIZED_NONCE || forceFetch) {
      this.nonce = await getNextNonce(this.ethWalletAddress);
    }
    return this.nonce;
  }

  // Increment nonce by 1. Meant to be done after a successful transaction
  // with the IDEX contract.
  incrementNonce(incrAmount: number = 1) {
    this.nonce += incrAmount;
  }

  async withdrawToken(tokenTicker: string, amount: string) {
    const withdrawResponse = await withdraw({
      contractAddr: await getIdexContractAddr(),
      amount: amount,
      tokenCurrencyInfo: await getCurrencyInfo(tokenTicker),
      nonce: await this.getNonce(),
      walletAddr: this.ethWalletAddress
    });
    this.incrementNonce();
    return withdrawResponse;
  }

  // Posting an order to sell ETH to buy a token.
  async postBuyOrder({
    tokenTicker,
    price,
    amount
  }: {
    tokenTicker: string,
    price: string,
    amount: string
  }) {
    const buyPrice = new BigNumber(price);
    const buyAmount = new BigNumber(amount);

    // Convert the amount of ETH to sell to Wei.
    const sellAmountEth = buyPrice.multipliedBy(buyAmount);
    const sellAmountWei = sellAmountEth.multipliedBy(ETH_DECIMALS_MULTIPLIER);

    // Convert the amount of token to sell to its decimals
    const buyTokenCurrencyInfo = await getCurrencyInfo(tokenTicker);
    const buyAmountDecimals = toContractPrecision(
      buyAmount,
      buyTokenCurrencyInfo.decimals
    );

    const nonce = await this.getNonce();

    // Call IdexAPI to post the Order
    const postOrderResponse = await postOrder({
      contractAddr: await getIdexContractAddr(),
      tokenBuyAddr: buyTokenCurrencyInfo.address,
      amountBuyDecimals: buyAmountDecimals.toFixed(),
      tokenSellAddr: ETH_TOKEN_ADDRESS,
      amountSellDecimals: sellAmountWei.toFixed(),
      nonce: nonce,
      walletAddr: this.ethWalletAddress
    });
    this.incrementNonce();
    return postOrderResponse;
  }

  async buyToken({
    tokenTicker,
    amount,
    expectedTotalPrice,
    priceTolerance
  }: {
    tokenTicker: string,
    amount: string,
    expectedTotalPrice: string,
    priceTolerance: number
  }) {
    return this._tradeToken({
      tokenTicker: tokenTicker,
      amount: amount,
      expectedTotalPrice: expectedTotalPrice,
      priceTolerance: priceTolerance,
      type: "buy"
    });
  }

  async sellToken({
    tokenTicker,
    amount,
    expectedTotalPrice,
    priceTolerance
  }: {
    tokenTicker: string,
    amount: string,
    expectedTotalPrice: string,
    priceTolerance: number
  }) {
    return this._tradeToken({
      tokenTicker: tokenTicker,
      amount: amount,
      expectedTotalPrice: expectedTotalPrice,
      priceTolerance: priceTolerance,
      type: "sell"
    });
  }

  // Buying a token by filling buy orders (sell ETH)
  async _tradeToken({
    tokenTicker,
    amount,
    expectedTotalPrice,
    priceTolerance,
    type
  }: {
    tokenTicker: string,
    amount: string,
    expectedTotalPrice: string,
    priceTolerance: number,
    type: OrderType
  }) {
    const orderPrice: OrderPrice = await getOrdersForAmount(
      amount,
      tokenTicker,
      type
    );

    const expTotalPrice = BigNumber(expectedTotalPrice);
    const actualPrice = BigNumber(orderPrice.totalPrice);
    if (actualPrice.isGreaterThan(expTotalPrice)) {
      const priceError = actualPrice
        .minus(expTotalPrice)
        .dividedBy(expTotalPrice);
      if (priceError.isGreaterThan(priceTolerance)) {
        throw new TotalPriceIncreasedError({
          ticker: tokenTicker,
          exchange: "IDEX",
          type: type,
          requestedAmount: amount,
          expectedPrice: expTotalPrice.toFixed(),
          actualPrice: actualPrice.toFixed(),
          tolerace: priceTolerance
        });
      }
    }
    const nonce = await this.getNonce();
    const tokenCurrencyInfo = await getCurrencyInfo(tokenTicker);

    // Call IdexAPI to post the Order
    const tradeResponse = await trade({
      orders: orderPrice.orders,
      amountBuy: amount,
      tokenFillDecimals: tokenCurrencyInfo.decimals,
      expectedAmountFill: actualPrice.toFixed(),
      walletAddr: this.ethWalletAddress,
      nonce: nonce
    });
    this.incrementNonce(orderPrice.orders.length);
    return tradeResponse;
  }
}
