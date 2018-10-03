// @flow
import { handler, processor } from "src/lib/processing";

import Web3Session from "src/lib/ethereum/Web3Session";
import EthTransferBuilder from "src/lib/ethereum/EthTransferBuilder";
import Erc20TransferBuilder from "src/lib/ethereum/Erc20TransferBuilder";

import Asset from "../models/Asset";
import Account from "../models/Account";
import EthereumTransaction from "../models/EthereumTransaction";

import { NotFoundError } from "../errors";

@processor("eth_transaction_queue")
export default class TransactionProcessor {
  @handler()
  static async broadcastEthTransaction(transationId: number) {
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

    const { gasPriceWeiBN, gasLimitBN } = txn;
    if (gasPriceWeiBN == null || gasLimitBN == null) {
      throw new NotFoundError(`missing gas price or gas limit on tx ${txn.id}`);
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

      const transfer = new Erc20TransferBuilder()
        .setSession(web3Session)
        .setContract(contract, decimals, "TST")
        .setSenderAddress(txn.attr.from)
        .setToAddress(txn.attr.to)
        .setNonce(txn.attr.nonce)
        .setGasLimit(gasLimitBN)
        .setGasPriceWei(gasPriceWeiBN)
        .setTransferAmount(txn.valueBN);

      await transfer.build(account.attr.privateKey);
      await transfer.send();
    } else {
      const transfer = new EthTransferBuilder()
        .setSession(web3Session)
        .setSenderAddress(txn.attr.from)
        .setToAddress(txn.attr.to)
        .setNonce(txn.attr.nonce)
        .setGasLimit(gasLimitBN)
        .setGasPriceWei(gasPriceWeiBN)
        .setTransferAmount(txn.valueBN);

      await transfer.build(account.attr.privateKey);
      await transfer.send();
    }
  }

  @handler()
  static async retryEthTransaction(transationId: number) {
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
      throw new NotFoundError(`ETH account not found: ${txn.attr.from}`);
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
