import "jest";
import * as MarketScouter from "../MarketScouter";
import * as IdexApi from "../../exchange-api/IdexApi";

const JUST_A_LINK_MARKET = {
  buyToken: "LINK",
  sellToken: "ETH",
  exchange: IdexApi.NAME
};
const ETH_LINK_MARKET = {
  buyToken: "ETH",
  sellToken: "LINK",
  exchange: IdexApi.NAME
};

test("getMarketsForToken() works", async () => {
  let markets = await MarketScouter.getMarketsForToken({
    buyToken: "LINK",
    sellToken: "ETH"
  });
  expect(markets).toEqual([JUST_A_LINK_MARKET]);

  markets = await MarketScouter.getMarketsForToken({
    buyToken: "ETH",
    sellToken: "LINK"
  });
  expect(markets).toEqual([ETH_LINK_MARKET]);
});
