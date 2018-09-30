// @flow
import { BigNumber } from "bignumber.js";
import { handler, processor } from "src/lib/processing";

import EthSession from "src/lib/ethereum/EthSession";
import Web3Session from "src/lib/ethereum/Web3Session";
import Erc20Session from "src/lib/ethereum/Erc20Session";

import Asset from "../models/Asset";
import Account from "../models/Account";
import EthereumTransaction from "../models/EthereumTransaction";

import EthereumTx from "ethereumjs-tx";

import type { RawTransaction } from "src/lib/ethereum/typedef";

import { NotFoundError } from "../errors";

@processor("eth_transaction_queue")
export default class TransactionProcessor {
  @handler()
  static async broadcastEthTransaction(transationId: number) {
    return;
    console.log("sending eth transaction");
    const txn: ?EthereumTransaction = await EthereumTransaction.findById(
      transationId
    );

    if (txn == null) {
      throw new NotFoundError(`transaction not found ${transationId}`);
    }

    await txn.syncWithNetwork();
    if (txn.confirmed) {
      return;
    }

    const asset: ?Asset = await Asset.findById(txn.attr.assetId);
    if (asset == null) {
      throw new NotFoundError(`asset not found ${txn.attr.assetId}`);
    }

    if (!asset.isEth || !asset.isErc20) {
      throw `not an ethereum asset ${asset.attr.ticker}`;
    }

    const account = await Account.findByAddress(
      txn.attr.from,
      txn.attr.assetId
    );
    if (account == null) {
      throw new NotFoundError(`eth account not found ${txn.attr.from}`);
    }

    const web3Session = Web3Session.createSession();
    if (asset.isErc20) {
      const { contractAddress, ABI, decimals } = asset.attr;

      if (contractAddress == null || ABI == null || decimals == null) {
        throw new NotFoundError(
          `erc20 attributes missing for ${asset.attr.ticker}`
        );
      }

      const contract = new web3Session.web3.eth.Contract(ABI, contractAddress, {
        from: txn.attr.from
      });

      const session = new Erc20Session({
        contract: contract,
        fromAddress: txn.attr.from,
        session: web3Session,
        decimals: decimals,
        ticker: asset.attr.ticker
      });

      session.transferTo({
        nonce: txn.attr.nonce,
        privateKey: account.attr.privateKey,
        gasPrice: txn.gasPriceWeiBN,
        toAddress: txn.attr.to,
        transferAmount: new BigNumber(txn.attr.value)
      });
    } else {
      const session = new EthSession({
        session: web3Session,
        fromAddress: txn.attr.from
      });

      session.transferTo({
        nonce: txn.attr.nonce,
        value: txn.valueBN,
        gasLimit: txn.gasLimitBN,
        gasPrice: txn.gasPriceBN,
        toAddress: txn.attr.to,
        privateKey: account.attr.privateKey
      });
    }
  }

  @handler()
  static async retryEthTransaction(transationId: number) {
    const eth = await Asset.fromTicker("eth");
    const session = Web3Session.createSession();
    const txn: ?EthereumTransaction = await EthereumTransaction.findById(
      transationId
    );

    if (txn == null) {
      throw new NotFoundError(`transaction not found ${transationId}`);
    }

    const account: ?Account = await Account.findByAddress(
      txn.attr.from,
      txn.attr.assetId
    );
    if (account == null) {
      throw new NotFoundError(
        `${txn.attr.ticker} account not found: ${txn.attr.from}`
      );
    }

    await txn.syncWithNetwork();
    if (txn.confirmed) {
      return;
    }

    if (txn.attr.blockNumber != null) {
      console.warn(`transaction already confirmed ${txn.attr.id}`);
      return;
    }

    // Add 10gwei to gas price and re-broadcast
    const increment = Web3Session.ONE_GWEI.times(10);
    account.incrementGasBalanceWei(null, increment);
    const newGasPrice = txn.gasPriceWeiBN.plus(increment);
    await txn.update({
      gasPrice: newGasPrice.toString(),
      numRetries: txn.attr.numRetries + 1
    });

    console.log("re-sending eth transaction");
    this.broadcastEthTransaction.publish(transationId);
  }
}
