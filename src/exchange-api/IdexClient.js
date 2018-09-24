//@flow
import {
  getOrdersForAmount,
  getCurrencies,
  getIdexContractAddress,
  getNextNonce,
  postOrder,
  trade
} from "./IdexApi";
import { TotalPriceIncreasedError } from "./errors";
import { BigNumber } from "bignumber.js";

import type { OrderPrice } from "./IdexApi";

const ETH_DECIMALS_MULTIPLIER = "1000000000000000000";
const ETH_TOKEN_ADDRESS: EthAddress =
  "0x0000000000000000000000000000000000000000";
const UNINITIALIZED_NONCE = -1;

// Dictionary of all tokens on IDEX. Retrieved from IDEX.
let CURRENCIES = {};
async function getCurrencyInfo(ticker: string) {
  let currencyInfo = CURRENCIES[ticker];
  if (currencyInfo == null) {
    CURRENCIES = await getCurrencies();
    currencyInfo = CURRENCIES[ticker];
  }
  return currencyInfo;
}

// This isn't expected to change once initialized.
let IDEX_CONTRACT_ADDRESS: EthAddress;
async function initIdexContractAddress() {
  IDEX_CONTRACT_ADDRESS = await getIdexContractAddress();
}
initIdexContractAddress();

export default class IdexClient {
  ethWalletAddress: EthAddress;

  // Current assumed Nonce for interacting with Idex contract.
  // Initial value is -1.
  nonce: number;

  constructor(ethWalletAddress: EthAddress) {
    this.ethWalletAddress = ethWalletAddress;
    this.nonce = UNINITIALIZED_NONCE;
  }

  async getNonce(forceFetch: boolean = false): Promise<number> {
    if (this.nonce == UNINITIALIZED_NONCE || forceFetch) {
      this.nonce = await getNextNonce(this.ethWalletAddress);
    }
    return this.nonce;
  }

  // Increment nonce by 1. Meant to be done after a successful transaction
  // with the IDEX contract.
  incrementNonce() {
    this.nonce += 1;
  }

  // Posting an order to sell ETH to buy a token.
  async postBuyOrder(tokenTicker: string, price: string, amount: string) {
    const buyPrice = new BigNumber(price);
    const buyAmount = new BigNumber(amount);

    // Convert the amount of ETH to sell to Wei.
    const sellAmountEth = buyPrice.multipliedBy(buyAmount);
    const sellAmountWei = sellAmountEth.multipliedBy(ETH_DECIMALS_MULTIPLIER);

    // Convert the amount of token to sell to its decimals
    const buyTokenCurrencyInfo = await getCurrencyInfo(tokenTicker);
    const buyAmountDecimals = buyAmount.multipliedBy(
      "1" + "0".repeat(buyTokenCurrencyInfo.decimals)
    );

    const nonce = await this.getNonce();

    // Call IdexAPI to post the Order
    const postOrderResponse = await postOrder(
      IDEX_CONTRACT_ADDRESS,
      buyTokenCurrencyInfo.address,
      buyAmountDecimals.toFixed(),
      ETH_TOKEN_ADDRESS,
      sellAmountWei.toFixed(),
      nonce,
      this.ethWalletAddress
    );
    incrementNonce();
    return postOrderResponse;
  }

  // Buying a token by filling buy orders (sell ETH)
  async buyToken(
    tokenTicker: string,
    amount: number,
    expectedTotalPrice: string,
    priceTolerance: number
  ) {
    const orderPrice: OrderPrice = await getOrdersForAmount(
      amount,
      tokenTicker,
      "buy"
    );

    const expTotalPriceBN = BigNumber(expectedTotalPrice);
    const actualPriceBN = BigNumber(orderPrice.totalPrice);
    if (actualPriceBN > expTotalPriceBN) {
      const priceError = expTotalPriceBN
        .minus(expectedTotalPrice)
        .dividedBy(expTotalPriceBN);
      if (priceError.isGreaterThan(priceTolerance)) {
        throw new TotalPriceIncreasedError(
          tokenTicker,
          "IDEX",
          amount,
          expTotalPriceBN,
          actualPriceBN,
          priceTolerance
        );
      }
    }

    const nonce = await this.getNonce();

    // Call IdexAPI to post the Order
    const buyTokenResponse = await trade(
      orderPrice.orders,
      amount.toFixed(),
      this.ethWalletAddress,
      nonce
    );
    incrementNonce();
    return buyTokenResponse;
  }
}
