// @flow
import type { $Request, $Response } from "express";
const util = require("util");
import type { Knex$Transaction } from "knex";

import { BigNumber } from "bignumber.js";

import { wrapAsync, TokioRouter } from "src/lib/express";

import FeeEstimator from "./fee-estimate";
import Web3Session from "src/lib/ethereum/Web3Session";
import * as MarketScouter from "../exchange-api/MarketScouter";

import User from "./models/User";
import Asset from "./models/asset";
import Account from "./models/Account";
import BalanceEvent from "./models/BalanceEvent";
import AccountBalance from "./models/AccountBalance";
import UserBalance from "./models/UserBalance";
import EthereumTransaction from "./models/EthereumTransaction";
import TransactionProcessor from "./processing/TransactionProcessor";

import {
  LockError,
  NotFoundError,
  AccountBusyError,
  UnknownAccountError,
  InvalidBalanceError,
  InvalidRecipientError,
  InvalidParameterError
} from "./errors";

const router = new TokioRouter();

router.post(
  "/:buyToken/:sellToken",
  wrapAsync(async (req: $Request, res: $Response) => {
    // $FlowFixMe
    const body: Json = req.body || {};
    let buyToken: ?string = req.params.buyToken;
    let sellToken: ?string = req.params.sellToken;
    const userId: ?string = body.userId;
    const amount: ?string = body.amount;
    let amountToken: ?string = body.amountToken;
    const expectedPrice: ?string = body.expectedPrice;

    if (
      buyToken == null ||
      sellToken == null ||
      userId == null ||
      amount == null ||
      amountToken == null ||
      expectedPrice == null
    ) {
      throw new InvalidParameterError(
        `'buyToken', 'sellToken', 'userId', 'amount', 'amountToken', and 'expectedPrice' are required.`
      );
    }

    if (isNaN(amount) || BigNumber(amount).isLessThan(0)) {
      throw new InvalidParameterError(`amount=${amount} is not a number > 0.`);
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

    const buyAsset = await Asset.fromTicker(buyToken);
    const sellAsset = await Asset.fromTicker(sellToken);
    if (!buyAsset) {
      throw new InvalidParameterError(`buy Asset not found ${buyToken}`);
    }
    if (!sellAsset) {
      throw new InvalidParameterError(`sell Asset not found ${sellToken}`);
    }

    // First determine if they have enough userSellToken
    let reqSellTokenAmount;

    // TODO(sujen) don't block on this. Just get the promise and resolve it in 2 blocks:
    // 1. When reqSellTokenAmount is needed (ELSE block below), and 2: After the pending AccountBalance txn.
    let price: MarketScouter.Price = await MarketScouter.getBestPrice({
      buyToken: buyToken,
      sellToken: sellToken,
      amount: amount,
      amountToken: amountToken
    });

    if (amountToken === sellToken) {
      // amount input is already in sellToken
      reqSellTokenAmount = amount;
    } else {
      // convert buyToken amount into sellAmount.
      // Query for market price for conversion
      reqSellTokenAmount = price.amount;
    }

    // Temprorary, until we decouple Address from AccountBalance
    const TEMP_FROM_ADDR = "0xc99E5baBEaa47fD9BA357381C706c5407a729f25";
    // Ideally we want to be able to get AccountBalance without fetching Account.
    const userSellTokenAccount = await Account.findByAddress(
      TEMP_FROM_ADDR,
      sellAsset.id
    );
    console.log("User SellTokenAccount: " + util.inspect(userSellTokenAccount));

    let userSellTokenBalance = await AccountBalance.fetch({
      userId: parseInt(userId),
      assetId: parseInt(sellAsset.id),
      accountId: userSellTokenAccount.id
    });

    console.log("User SellTokenBalance: " + util.inspect(userSellTokenBalance));

    if (
      userSellTokenBalance.availableBalanceBN.isLessThan(reqSellTokenAmount)
    ) {
      throw new InvalidBalanceError(
        `Insufficient token balance: ${userSellTokenBalance.availableBalanceBN.toFixed()}${
          sellAsset.attr.ticker
        } is not enough for trade: ${util.inspect(price)}`
      );
    }

    // Make pending balance events for user
    try {
      // Decrement user's sellToken balance by amount.
      const r = await userSellTokenBalance.transaction(
        async (trx: knex$transaction) => {
          return await userSellTokenBalance.adjustPendingBalance(
            BigNumber(reqSellTokenAmount).times(-1),
            trx
          );

          // Ideally, add an entry to UserBalance here as well, in pending state.
        }
      );
      console.log("ZZZ userSellToken.adjustPendingBalance response: " + r);
    } catch (e) {
      if (e instanceof LockError) {
        const lockError: LockError = e;
        throw new AccountBusyError(lockError.message, e);
      } else {
        throw e;
      }
    }

    // now try and make the trade
    //const resp = await MarketScouter.buyTokenForPrice(price);
    //console.log("buyTokenForPrice resp: " + util.inspect(resp));

    // confirm the pending balance for user
    try {
      // Decrement user's sellToken balance by amount.
      await userSellTokenBalance.transaction(async (trx: knex$transaction) => {
        // TODO(sujen) figure out why the orm isn't updating the object after the previous transaction.
        // I shouldn't need to re-fetch here.....?
        // Maybe its because I am out of the transaction.
        userSellTokenBalance = await AccountBalance.fetch({
          userId: parseInt(userId),
          assetId: parseInt(sellAsset.id),
          accountId: userSellTokenAccount.id
        });
        console.log(
          "ZZZZ userSellTokenBalance pending: " +
            userSellTokenBalance.totalPending
        );
        return await userSellTokenBalance.confirmPendingBalance(
          BigNumber(reqSellTokenAmount).times(-1),
          trx
        );
        // Ideally, add an entry to UserBalance here as well, in pending state.
      });
    } catch (e) {
      if (e instanceof LockError) {
        const lockError: LockError = e;
        throw new AccountBusyError(lockError.message, e);
      } else {
        throw e;
      }
    }

    res.json({
      status:
        "success, account user balance: " +
        userSellTokenBalance.availableBalanceBN.toFixed()
    });
  })
);

export default router;
