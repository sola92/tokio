// @flow
import type { $Request, $Response } from "express";
import type { Knex$Transaction } from "knex";

import { BigNumber } from "bignumber.js";

import { wrapAsync, TokioRouter } from "src/lib/express";

import FeeEstimator from "./fee-estimate";
import Web3Session from "src/lib/ethereum/Web3Session";

import User from "./models/User";
import Asset from "./models/Asset";
import Account from "./models/Account";
import BalanceEvent from "./models/BalanceEvent";
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
    if (transferAmount.isNegative()) {
      throw new InvalidParameterError(
        `amount cannot be negative: ${transferAmount.toString()}`
      );
    }

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

        const house = await User.getHouseUser();

        const gasEstimate: BigNumber = await FeeEstimator.estimateGasUsage(
          asset
        );
        const gasPriceWei = await FeeEstimator.estimateGasPrice(asset, "wei");
        const ethTxn = await EthereumTransaction.insert(
          {
            to: to,
            from: from,
            state: "pending",
            nonce: nonce,
            chainId: chainId,
            gasLimit: gasEstimate.toString(),
            gasPriceWei: gasPriceWei.toString(),
            assetId: asset.id,
            value: transferAmount.toString()
          },
          trx
        );

        // Charge the gas fees to the house.
        const estimateFee = gasPriceWei.times(gasEstimate);
        await BalanceEvent.insert(
          {
            userId: house.id,
            accountId: account.id,
            assetId: asset.id,
            amount: session
              .weiToEther(estimateFee)
              .times(-1)
              .toString(),
            action: "gas",
            note: `gas for withdrawal to ${to}`,
            state: "pending",
            withdrawalId: ethTxn.id
          },
          trx
        );

        await BalanceEvent.insert(
          {
            userId: userId,
            accountId: account.attr.id,
            assetId: asset.attr.id,
            amount: transferAmount.times(-1).toString(),
            action: "withdraw",
            note: note || `withdrawal to ${to}`,
            state: "pending",
            withdrawalId: ethTxn.attr.id
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
      if (asset.isEth || asset.isErc20) {
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
