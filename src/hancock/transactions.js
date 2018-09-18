// @flow
import type { $Request, $Response } from "express";
import type { Knex$Transaction } from "knex";

import { BigNumber } from "bignumber.js";

import { wrapAsync, TokioRouter } from "src/lib/express";

import Asset from "./models/Asset";
import Web3Session from "src/lib/ethereum/Web3Session";
import Account from "./models/Account";
import BalanceLog from "./models/BalanceLog";
import AccountBalance from "./models/AccountBalance";
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
  "/:userId/:ticker",
  wrapAsync(async (req: $Request, res: $Response) => {
    // $FlowFixMe
    const body: Json = req.body || {};
    const to: ?string = body.to;
    const from: ?string = body.from;
    const value: ?string = body.value;
    const note: ?string = body.note;
    const ticker: ?string = req.params.ticker;
    const userIdStr: ?string = req.params.userId;

    if (
      to == null ||
      from == null ||
      value == null ||
      ticker == null ||
      userIdStr == null
    ) {
      throw new InvalidParameterError(
        `'to', 'from', 'value' and 'ticker' are required. Got ${JSON.stringify({
          to,
          from,
          value,
          ticker
        })}.`
      );
    }

    const userId = parseInt(userIdStr);
    if (to == from) {
      throw new InvalidRecipientError(`Sender cannot be reciepient ${from}`);
    }

    const asset = await Asset.fromTickerOptional(ticker);
    if (asset == null) {
      throw new InvalidParameterError(`Asset not found ${ticker}`);
    }

    const account: ?Account = await Account.findByAddress(from, asset.attr.id);
    if (account == null) {
      throw new UnknownAccountError(`Account not found: ${from}`);
    }

    const accountBalance = await AccountBalance.fetch({
      userId,
      assetId: asset.attr.id,
      accountId: account.attr.id
    });

    if (accountBalance == null) {
      throw new InvalidBalanceError(
        `${asset.attr.ticker} balance not found for account: ${from}`
      );
    }

    const transferAmount = new BigNumber(value);
    if (accountBalance.availableBalanceBN.isLessThan(transferAmount)) {
      const tokenBalance = accountBalance.availableBalanceBN;
      throw new InvalidBalanceError(
        `Insuffifient token balance: ${tokenBalance.toString()}${
          asset.attr.ticker
        }. ` + `Sending ${transferAmount.toString()}${asset.attr.ticker}`
      );
    }

    try {
      await account.transaction(async (trx: Knex$Transaction) => {
        const session = Web3Session.createSession();
        const nonce = await account.fetchAndIncrementNonce();
        const chainId = await session.getChainId();

        const ethTxn = await EthereumTransaction.insert(
          {
            to: to,
            from: from,
            state: "pending",
            nonce: nonce,
            chainId: chainId,
            ticker: ticker,
            value: transferAmount.toString()
          },
          trx
        );

        await BalanceLog.insert(
          {
            userId: userId,
            accountId: account.attr.id,
            assetId: asset.attr.id,
            amount: transferAmount.isNegative()
              ? transferAmount.toString()
              : transferAmount.times(-1).toString(),
            action: "withdraw",
            note: note || `withdrawal to ${to}`,
            state: "pending"
          },
          trx
        );

        res.json(ethTxn.toJSON());
        await TransactionProcessor.broadcastEthTransaction.publish(
          ethTxn.attr.id
        );
      });
    } catch (e) {
      if (e instanceof LockError) {
        const lockError: LockError = e;
        throw new AccountBusyError(lockError.message, e);
      } else {
        throw e;
      }
    }
  })
);

router.get(
  "/:ticker-:transactionId",
  wrapAsync(
    async (req: $Request, res: $Response): Promise<mixed> => {
      const ticker: ?string = req.params.ticker;
      const transactionId: ?number = parseInt(req.params.transactionId);
      if (ticker == null) {
        throw new InvalidParameterError("ticker is required");
      }

      if (transactionId == null) {
        throw new InvalidParameterError("transaction id is required");
      }

      const asset = await Asset.fromTickerOptional(ticker);
      if (asset == null) {
        throw new NotFoundError(`Asset not found ${ticker}`);
      }

      let transaction: ?EthereumTransaction;
      if (asset.isTicker("ETH") || asset.attr.type === "erc20") {
        transaction = await EthereumTransaction.findById(transactionId);
      }

      if (transaction == null) {
        throw new NotFoundError(`Transaction not found ${transactionId}`);
      }

      res.json(transaction.toJSON());
    }
  )
);

export default router;
