//@flow
import { BigNumber } from "bignumber.js";
import type { OrderType } from "./IdexApi";

export class CannotFillOrderError extends Error {
  ticker: string;
  exchange: string;
  fillableAmount: string;
  requestedAmount: string;

  constructor(
    {
      ticker,
      exchange,
      fillableAmount,
      requestedAmount
    }: {
      ticker: string,
      exchange: string,
      fillableAmount: string,
      requestedAmount: string
    },
    ...params: Array<any>
  ) {
    super(
      `Unable to fill order for token ${ticker} on ${exchange}. Can only fill ${fillableAmount}/${requestedAmount}.`
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
  type: OrderType;
  requestedAmount: string;
  expectedPrice: string;
  actualPrice: string;
  tolerance: number;

  constructor(
    {
      ticker,
      exchange,
      type,
      requestedAmount,
      expectedPrice,
      actualPrice,
      tolerance
    }: {
      ticker: string,
      exchange: string,
      type: OrderType,
      requestedAmount: string,
      expectedPrice: string,
      actualPrice: string,
      tolerance: number
    },
    ...params: Array<any>
  ) {
    super(
      `Token=${ticker}, Exchange=${exchange}, Type=${type}, RequestedAmount=${requestedAmount}. ActualPrice=${actualPrice} is too high compared to ExpectedPrice=${expectedPrice} with tolerance=${tolerance}.`
    );
    this.ticker = ticker;
    this.exchange = exchange;
    this.type = type;
    this.requestedAmount = requestedAmount;
    this.expectedPrice = expectedPrice;
    this.actualPrice = actualPrice;
    this.tolerance = tolerance;
  }
}
