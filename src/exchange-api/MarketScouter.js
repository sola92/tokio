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

export type Price = {
  buyToken: string,
  sellToken: string,
  price: string,
  amount: string,
  avgUnitPrice: string,
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

const TO_PRICE = (market: Market, price: string, amount: string): Price => ({
  buyToken: market.buyToken,
  sellToken: market.sellToken,
  price: price,
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

async function getPriceInMarket(
  market: Market,
  amount: string,
  amountToken: string
): Promise<Price> {
  if (market.exchange === IdexApi.NAME) {
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
      return TO_PRICE(
        market,
        await IdexApi.getPriceForAmount(market.sellToken, amount, "sell"),
        amount
      );
    } else {
      if (market.buyToken !== amountToken) {
        throw Error(
          "Unexpected: amountToken should be buyToken when buying a token on IDEX."
        );
      }
      return TO_PRICE(
        market,
        await IdexApi.getPriceForAmount(market.buyToken, amount, "buy"),
        amount
      );
    }
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
