// @flow
import type { $Request, $Response } from "express";
const util = require("util");

import { BigNumber } from "bignumber.js";

import { wrapAsync, TokioRouter } from "src/lib/express";

import { InvalidParameterError } from "./errors";

import * as MarketScouter from "../exchange-api/MarketScouter";

import * as IdexApi from "../exchange-api/IdexApi";

const router = new TokioRouter();

router.get(
  "/:buyToken/:sellToken",
  wrapAsync(
    async (req: $Request, res: $Response): Promise<mixed> => {
      let buyToken: ?string = req.params.buyToken;
      let sellToken: ?string = req.params.sellToken;
      // $FlowFixMe
      const amount: ?string = req.query.amount;
      // $FlowFixMe
      let amountToken: ?string = req.query.amountToken;

      if (
        buyToken == null ||
        sellToken == null ||
        amount == null ||
        amountToken == null
      ) {
        throw new InvalidParameterError(
          `'buyToken', 'sellToken', 'amount' and 'amountToken' params are required.`
        );
      }

      // normalize inputs
      buyToken = buyToken.toUpperCase();
      sellToken = sellToken.toUpperCase();
      amountToken = amountToken.toUpperCase();
      if (amountToken !== buyToken && amountToken !== sellToken) {
        throw new InvalidParameterError(
          `'amountToken' must be either 'buyToken' or 'sellToken'.`
        );
      }

      if (isNaN(amount) || BigNumber(amount).isLessThan(0)) {
        throw new InvalidParameterError(
          `amount=${amount} is not a number > 0.`
        );
      }

      if (!(amountToken === buyToken || amountToken === sellToken)) {
        throw new InvalidParameterError(
          `amountToken=${amountToken} needs to be buyToken=${buyToken} or sellToken=${sellToken}`
        );
      }

      // Since we will first only have IDEX, disallow amount inputs in ETH.
      // TODO(sujen) Will re-evaluate later after adding other exchanges to see if it is
      // worthwhile allowing flexibility in choosing the quantity token.
      if (amountToken === "ETH") {
        throw new InvalidParameterError(
          "We don't support price checks for amounts in ETH."
        );
      }

      const price: MarketScouter.Price = await MarketScouter.getBestPrice({
        buyToken: buyToken,
        sellToken: sellToken,
        amount: amount,
        amountToken: amountToken
      });
      res.json(price);
    }
  )
);

export default router;
