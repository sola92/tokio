//@flow
import { BigNumber } from "bignumber.js";

export default class CannotFillOrderError extends Error {
  ticker: string;
  exchange: string;
  fillableAmount: BigNumber;
  requestedAmount: BigNumber;
  // Whether this is only to check the price, and not actually fill the order.
  checkOnly: boolean;

  constructor(
    ticker: string,
    exchange: string,
    fillableAmount: BigNumber,
    requestedAmount: BigNumber,
    checkOnly: boolean,
    ...params: Array<any>
  ) {
    super(
      `Unable to fill order for token ${ticker} on ${exchange}. Can only fill ${fillableAmount.toFixed()}/${requestedAmount.toFixed()}. checkOnly: ${checkOnly.toString()}`
    );
    this.ticker = ticker;
    this.exchange = exchange;
    this.fillableAmount = fillableAmount;
    this.requestedAmount = requestedAmount;
    this.checkOnly = checkOnly;
  }
}
