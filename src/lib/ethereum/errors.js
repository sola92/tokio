//@flow
import { BigNumber } from "bignumber.js";

export class InvalidAddressError extends Error {
  ticker: string;
  address: EthAddress;

  constructor(address: string, ticker: string, ...params: Array<any>) {
    super(`${address} is not a valid ${ticker} address`);
    this.ticker = ticker;
    this.address = address;
  }
}

export class InsufficientBalanceError extends Error {
  ticker: string;
  balance: BigNumber;
  required: BigNumber;

  constructor(
    balance: BigNumber,
    required: BigNumber,
    ticker: string,
    ...params: Array<any>
  ) {
    super(
      `insuffient balance: ${balance.toString()}${ticker}, ` +
        `sending: ${required.toString()}${ticker}`
    );
    this.ticker = ticker;
    this.balance = balance;
    this.required = required;
  }
}
