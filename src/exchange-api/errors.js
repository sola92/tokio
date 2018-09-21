//@flow
import { BigNumber } from "bignumber.js";

export class CannotFillOrderError extends Error {
  ticker: string;
  exchange: string;
  fillableAmount: BigNumber;
  requestedAmount: BigNumber;

  constructor(
    ticker: string,
    exchange: string,
    fillableAmount: BigNumber,
    requestedAmount: BigNumber,
    ...params: Array<any>
  ) {
    super(
      "Unable to fill order for token ${ticker} on ${exchange}. Can only fill ${fillableAmount.toFixed()}/${requestedAmount.toFixed()}."
    );
    this.ticker = ticker;
    this.exchange = exchange;
    this.fillableAmount = fillableAmount;
    this.requestedAmount = requestedAmount;
  }
}

export class TotalPriceIncreasedError extends Error {
  ticker: string;
  exchange: string;
  requestedAmount: BigNumber;
  expectedPrice: BigNumber;
  actualPrice: BigNumber;
  tolerance: number;

  constructor(
    ticker: string,
    exchange: string,
    requestedAmount: BigNumber,
    ...params: Array<any>
  ) {
    super(
      "Token=${ticker}, Exchange=${exchange}, RequestedAmount=${requestedAmount}. ActualPrice=${actualPrice.toFixed()} is too high compared to ExpectedPrice=${expectedPrice.toFixed()} with tolerance=${tolerance}."
    );
    this.ticker = ticker;
    this.exchange = exchange;
    this.requestedAmount = requestedAmount;
    this.tolerance = tolerance;
  }
}
