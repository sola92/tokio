//@flow
import {
  getCurrencies,
  getIdexContractAddress,
  getNextNonce,
  postOrder
} from "./IdexApi";
import { BigNumber } from "bignumber.js";

const ETH_DECIMALS_MULTIPLIER = "1000000000000000000";
const ETH_TOKEN_ADDRESS: EthAddress =
  "0x0000000000000000000000000000000000000000";
const UNINITIALIZED_NONCE = -1;

// Dictionary of all tokens on IDEX. Retrieved from IDEX.
let CURRENCIES = {};

async function getCurrencyInfo(ticker: string) {
  let currencyInfo = CURRENCIES[ticker];
  console.log("zcurren" + currencyInfo);
  if (currencyInfo == null) {
    CURRENCIES = await getCurrencies();
    currencyInfo = CURRENCIES[ticker];
  }
  return currencyInfo;
}

// This isn't expected to change once initialized.
let IDEX_CONTRACT_ADDRESS: EthAddress;
async function initIdexContractAddress() {
  if (IDEX_CONTRACT_ADDRESS == null) {
    IDEX_CONTRACT_ADDRESS = await getIdexContractAddress();
  }
  return IDEX_CONTRACT_ADDRESS;
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

  async getNonce(): Promise<number> {
    if (this.nonce == UNINITIALIZED_NONCE) {
      this.nonce = await getNextNonce(this.ethWalletAddress);
      console.log("zz got nonce to be " + this.nonce);
    }
    return this.nonce;
  }

  // Increment nonce by 1. Meant to be done after a successful transaction
  // with the IDEX contract.
  incrementNonce() {
    this.nonce += 1;
  }

  // Selling ETH to buy a token.
  async postBuyOrder(tokenTicker: string, price: string, amount: string) {
    const buyPrice = new BigNumber(price);
    const buyAmount = new BigNumber(amount);
    const sellAmountEth = buyPrice.multipliedBy(buyAmount);

    const sellAmountWei = sellAmountEth.multipliedBy(ETH_DECIMALS_MULTIPLIER);

    const buyTokenCurrencyInfo = await getCurrencyInfo(tokenTicker);
    const buyAmountDecimals = buyAmount.multipliedBy(
      "1" + "0".repeat(buyTokenCurrencyInfo.decimals)
    );

    let nonce = await this.getNonce();

    // Call IdexAPI to post the Order
    let postOrderResponse = await postOrder(
      IDEX_CONTRACT_ADDRESS,
      buyTokenCurrencyInfo.address,
      buyAmountDecimals.toFixed(),
      ETH_TOKEN_ADDRESS,
      sellAmountWei.toFixed(),
      nonce,
      this.ethWalletAddress
    );
    return postOrderResponse;
  }
}
