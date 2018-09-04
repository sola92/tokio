// @flow
import type { $Request, $Response } from "express";
import type { Knex$Transaction } from "knex";

import { BigNumber } from "bignumber.js";

import { wrapAsync, TokioRouter } from "src/lib/express";
import Web3Session from "src/lib/ethereum/Web3Session";

import Asset from "./models/Asset";
import EthereumAccount from "./models/EthereumAccount";
import EthereumTransaction from "./models/EthereumTransaction";
import TransactionProcessor from "./processing/TransactionProcessor";

import {
  LockError,
  NotFoundError,
  AccountBusyError,
  InvalidBalanceError,
  InvalidParameterError
} from "./errors";

const router = new TokioRouter();

router.post(
  "/:ticker",
  wrapAsync(async (req: $Request, res: $Response) => {
    // $FlowFixMe
    const body: Json = req.body;
    const to: ?string = body.to;
    const from: ?string = body.from;
    const value: ?string = body.value;
    const ticker: ?string = req.params.ticker;

    if (to == null || from == null || value == null || ticker == null) {
      throw new InvalidParameterError(
        `'to', 'from', 'value' and 'ticker' are required`
      );
    }

    const account: ?EthereumAccount = await EthereumAccount.findOne({
      address: from
    });

    if (account == null) {
      throw new InvalidParameterError(`Account not found: ${from}`);
    }

    const pendingTxns = await EthereumTransaction.getPendingTransactions({
      from
    });

    if (pendingTxns.length > 0) {
      throw new AccountBusyError(
        `account (${from}) has unresolved transactions: ${pendingTxns
          .map(t => t.attr.id)
          .join(",")}`
      );
    }

    try {
      await account.transaction(async (trx: Knex$Transaction) => {
        await account.refresh();
        const tokenBalance: ?BigNumber = await account.getTokenBalance(ticker);
        if (tokenBalance == null) {
          throw new InvalidBalanceError(
            `${ticker} balance not found for account: ${from}`
          );
        }

        const transferAmount = new BigNumber(value);
        if (tokenBalance.isLessThan(transferAmount)) {
          throw new InvalidBalanceError(
            `Insuffifient token balance: ${tokenBalance.toString()}${ticker}. ` +
              `Sending ${transferAmount.toString()}${ticker}`
          );
        }

        const nonce = account.attr.lastNonce + 1;
        await account.update({ lastNonce: nonce }, trx);

        const session = Web3Session.createSession();
        const chainId = await session.getChainId();
        const gasPrice = await session.getGasPrice();
        const lastestGasLimit = await session.getLatestGasLimit();

        const maxGasCost = lastestGasLimit.times(gasPrice);

        await account.incrementGasBalance(maxGasCost, trx);

        const ethTxn: EthereumTransaction = await EthereumTransaction.query(
          trx
        ).insert({
          to: to,
          from: from,
          nonce: nonce,
          chainId: chainId,
          value: transferAmount.toString(),
          gasPrice: gasPrice.toString(),
          gasLimit: lastestGasLimit.toString()
        });

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

      const asset = await Asset.fromTicker(ticker);
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
