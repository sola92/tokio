//@flow
const util = require("util");
import * as IdexApi from "../exchange-api/IdexApi";
import * as IdexClient from "../exchange-api/IdexClient";
import { BigNumber } from "bignumber.js";

const EXCHANGES = [IdexApi.NAME];

type Market = {
  buyToken: string,
  sellToken: string,
  exchange: string
};

const OP_GET_PRICE = "GET_PRICE";
const OP_TRADE = "TRADE";
type MarketOperation = OP_GET_PRICE | OP_TRADE;

export type Price = {
  buyToken: string,
  sellToken: string,
  amount: string,
  avgUnitPrice: string,
  priceToken: string,
  exchange: string
};

const JUST_A_LINK_MARKET: Market = {
  buyToken: "LINK",
  sellToken: "ETH",
  exchange: IdexApi.NAME
};
const ETH_LINK_MARKET: Market = {
  buyToken: "ETH",
  sellToken: "LINK",
  exchange: IdexApi.NAME
};
const TOKEN_DIRECTORY = { ETH: [ETH_LINK_MARKET], LINK: [JUST_A_LINK_MARKET] };

const TO_PRICE = (
  market: Market,
  price: string,
  priceToken: string,
  amount: string
): Price => ({
  buyToken: market.buyToken,
  sellToken: market.sellToken,
  price: price,
  priceToken: priceToken,
  amount: amount,
  avgUnitPrice: BigNumber(price)
    .dividedBy(amount)
    .toFixed(),
  exchange: market.exchange
});

export function getMarketsForToken({
  buyToken,
  sellToken
}: {
  buyToken: string,
  sellToken: string
}): Array<Market> {
  return TOKEN_DIRECTORY[buyToken].filter(
    market => market.sellToken === sellToken
  );
}

async function idexMarketOp(
  market: Market,
  amount: string,
  amountToken: string,
  op: MarketOperation
) {
  let tradeToken;
  let orderType;
  if (amountToken === "ETH") {
    throw Error(
      "Unexpected: No support for trading in quantities of ETH on IDEX"
    );
  }
  if (market.buyToken === "ETH") {
    if (market.sellToken !== amountToken) {
      throw Error(
        "Unexpected: amountToken should be sellToken when buying ETH on IDEX."
      );
    }
    tradeToken = market.sellToken;
    orderType = "sell";
  } else {
    if (market.buyToken !== amountToken) {
      throw Error(
        "Unexpected: amountToken should be buyToken when buying a token on IDEX."
      );
    }
    tradeToken = market.buyToken;
    orderType = "buy";
  }

  switch (op) {
    case OP_GET_PRICE:
      return TO_PRICE(
        market,
        await IdexApi.getPriceForAmount(tradeToken, amount, orderType),
        amount
      );
    case OP_TRADE:
      return null;
    //return await IdexClient();
  }
}

async function getPriceInMarket(
  market: Market,
  amount: string,
  amountToken: string
): Promise<Price> {
  if (market.exchange === IdexApi.NAME) {
    return await idexMarketOp(market, amount, amountToken, OP_GET_PRICE);
  }
  throw Error(
    "Unexpected: Don't know how to handle Market: " + JSON.stringify(market)
  );
}

export async function getPrices({
  buyToken,
  sellToken,
  amount,
  amountToken
}: {
  buyToken: string,
  sellToken: string,
  amount: string,
  amountToken: string
}): Promise<Array<Price>> {
  // The only sellToken supported currently is ETH.
  const markets = getMarketsForToken({
    buyToken: buyToken,
    sellToken: sellToken
  });

  // only look at first market for now.
  return [await getPriceInMarket(markets[0], amount, amountToken)];
}

export async function getBestPrice({
  buyToken,
  sellToken,
  amount,
  amountToken
}: {
  buyToken: string,
  sellToken: string,
  amount: string,
  amountToken: string
}): Promise<Price> {
  return (await getPrices({
    buyToken: buyToken,
    sellToken: sellToken,
    amount: amount,
    amountToken: amountToken
  })).reduce(
    (bestPrice, p) =>
      bestPrice == null || BigNumber(p.price).isLessThan(bestPrice.price)
        ? p
        : bestPrice
  );
}

export async function buyTokenForPrice(price: Price) {
  if (market.exchange === IdexApi.NAME) {
  }
}
