//@flow
const util = require("util");
import * as IdexApi from "../exchange-api/IdexApi";
import IdexClient from "../exchange-api/IdexClient";
import { BigNumber } from "bignumber.js";
import winston from "winston";
const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

const EXCHANGES = [IdexApi.NAME];

type Market = {
  buyToken: string,
  sellToken: string,
  exchange: string
};

const OP_GET_PRICE = "GET_PRICE";
const OP_TRADE = "TRADE";
type MarketOperation = OP_GET_PRICE | OP_TRADE;

type MarketOpArgs = {
  market: Market,
  amount: string,
  amountToken: string,
  expectedPrice: ?Price
};

export type Price = {
  market: Market,
  price: string,
  priceToken: string,
  amount: string,
  amountToken: string,
  avgUnitPrice: string
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
  amount: string,
  amountToken: string
): Price => ({
  market: market,
  price: price,
  priceToken: priceToken,
  amount: amount,
  amountToken: amountToken,
  avgUnitPrice: BigNumber(price)
    .dividedBy(amount)
    .toFixed()
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

async function idexMarketOp(op: MarketOperation, args: MarketOpArgs) {
  let tradeToken;
  let orderType;
  if (args.amountToken === "ETH") {
    throw Error(
      "Unexpected: No support for trading in quantities of ETH on IDEX"
    );
  }
  if (args.market.buyToken === "ETH") {
    if (args.market.sellToken !== args.amountToken) {
      throw Error(
        "Unexpected: amountToken should be sellToken when buying ETH on IDEX."
      );
    }
    tradeToken = args.market.sellToken;
    orderType = "sell";
  } else {
    if (args.market.buyToken !== args.amountToken) {
      throw Error(
        "Unexpected: amountToken=" +
          args.amountToken +
          " buyToken=" +
          args.market.buyToken +
          " should be buyToken when buying a token on IDEX."
      );
    }
    tradeToken = args.market.buyToken;
    orderType = "buy";
  }

  switch (op) {
    case OP_GET_PRICE:
      // For getting the price, we use tradeToken instead of buyToken since this allows either "buying" or "selling" a token.
      return TO_PRICE(
        args.market,
        await IdexApi.getPriceForAmount(tradeToken, args.amount, orderType),
        /* priceToken */ "ETH",
        args.amount,
        args.amountToken
      );
    case OP_TRADE:
      if (args.expectedPrice == null) {
        throw Error("expectedPrice is required for an OP_TRADE.");
      }
      // Get an Ethereum Account
      // Temprorary, until we decouple Address from AccountBalance
      // TODO(sujen) the whole instantiation of IdexClient needs to change,
      // it should involve an IdexClient for one of our fund wallets. We need
      // another service that keeps track of wallets with funds.
      const TEMP_ETH_ADDR = "0xc99E5baBEaa47fD9BA357381C706c5407a729f25";

      const idexClient = new IdexClient(TEMP_ETH_ADDR);
      return await idexClient.buyToken({
        tokenTicker: args.market.buyToken,
        amount: args.amount,
        expectedTotalPrice: args.expectedPrice.price,
        priceTolerance: "0.1"
      });
  }
}

async function doMarketOp(op: MarketOperation, args: MarketOpArgs) {
  if (args.market.exchange === IdexApi.NAME) {
    return await idexMarketOp(op, args);
  }
  throw Error(
    "Unexpected: Don't know how to handle Market: " + JSON.stringify(market)
  );
}

async function getPriceInMarket(
  market: Market,
  amount: string,
  amountToken: string
): Promise<Price> {
  return doMarketOp(OP_GET_PRICE, {
    market: market,
    amount: amount,
    amountToken: amountToken
  });
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

  console.log("Markets: " + JSON.stringify(markets));
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
  logger.log(
    "info",
    "MarketScouter.buyTokenForPrice() " + JSON.stringify(price)
  );
  return doMarketOp(OP_TRADE, {
    market: price.market,
    amount: price.amount,
    amountToken: price.amountToken,
    expectedPrice: price
  });
}
