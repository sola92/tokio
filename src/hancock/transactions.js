// @flow
import { Router } from "express";
import type { $Request, $Response } from "express";

import { BigNumber } from "bignumber.js";

import Web3Session from "src/lib/ethereum/Web3Session";
import EthereumAccount from "./models/EthereumAccount";
import EthereumTransaction from "./models/EthereumTransaction";
import TransactionProcessor from "./processing/TransactionProcessor";

const router = new Router();

router.post("/:ticker", async (req: $Request, res: $Response) => {
  if (req.body) {
    res.status(400).send(`Invalid transaction params`);
    return;
  }

  // $FlowFixMe
  const body: Json = req.body;
  const to: ?string = body.to;
  const from: ?string = body.from;
  const value: ?string = body.value;
  const ticker: ?string = req.params.ticker;

  if (to == null || from == null || value == null || ticker == null) {
    res.status(400).send(`Invalid transaction params`);
    return;
  }

  const account: ?EthereumAccount = await EthereumAccount.findOne({
    address: from
  });

  if (account == null) {
    res.status(400).send(`Account not found: ${from}`);
    return;
  }

  const balance: ?BigNumber = await account.getBalance(ticker);
  if (balance == null) {
    res.status(400).send(`Balance not found`);
    return;
  }

  const transferAmount = new BigNumber(value);
  if (balance.isLessThan(transferAmount)) {
    res
      .status(400)
      .send(
        `Insuffifient balance: ${balance.toString()}${ticker}. ` +
          `Sending ${transferAmount.toString()}${ticker}`
      );
  }

  const nonce = account.attr.lastNonce + 1;
  const numUpdates = await EthereumAccount.query()
    .update({ lastNonce: nonce })
    .where("address", "=", account.attr.address)
    .where("lastNonce", "=", account.attr.lastNonce);

  if (numUpdates <= 1) {
    res.status(503).send(`Account busy, try again later`);
    return;
  }

  const session = Web3Session.createSession();
  const chainId = await session.getChainId();
  const gasPrice = await session.getGasPrice();
  const lastestBlock = await session.getLatestBlock();

  const txn: EthereumTransaction = await EthereumTransaction.query().insert({
    to: to,
    from: from,
    value: transferAmount.toString(),
    gasLimit: new BigNumber(lastestBlock.gasLimit).toString(),
    gasPrice: gasPrice.toString(),
    chainId: chainId,
    nonce: nonce
  });

  await TransactionProcessor.broadcastEthTransaction.publish(txn.attr.id);
});

router.get("/:ticker/:transactionId", async (req: $Request, res: $Response) => {
  const ticker: ?string = req.params.ticker;
  const transactionId: ?number = parseInt(req.params.transactionId);
  if (ticker == null || transactionId == null) {
    res.status(400).send(`Invalid transaction id ${req.params.transactionId}`);
    return;
  }

  const transaction: ?EthereumTransaction = await EthereumTransaction.findById(
    transactionId
  );

  if (transaction == null) {
    res.status(404).send(`Invalid transaction id ${transactionId}`);
    return;
  }

  res.json(transaction.toJSON());
});

export default router;
