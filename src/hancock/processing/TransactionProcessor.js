// @flow
import { BigNumber } from "bignumber.js";
import { handler, processor } from "src/lib/processing";

import EthSession from "src/lib/ethereum/EthSession";
import Web3Session from "src/lib/ethereum/Web3Session";
import Erc20Session from "src/lib/ethereum/Erc20Session";

import Asset from "../models/Asset";
import EthereumAccount from "../models/EthereumAccount";
import EthereumTransaction from "../models/EthereumTransaction";

@processor("eth_transaction_queue")
export default class TransactionProcessor {
  @handler()
  static async broadcastEthTransaction(transationId: number) {
    console.log("sending eth transaction");

    const txn: ?EthereumTransaction = await EthereumTransaction.findById(
      transationId
    );

    if (txn == null) {
      throw `transaction not found ${transationId}`;
    }

    if (txn.attr.blockNumber != null) {
      console.log("transaction already confirmed");
      return;
    }

    const fromAddr: ?EthereumAccount = await EthereumAccount.findOne({
      address: txn.attr.from
    });

    if (fromAddr == null) {
      throw `address not found ${txn.attr.from}`;
    }

    const web3Session = Web3Session.createSession();
    const { privateKey } = fromAddr.attr;
    const { contractAddress } = txn.attr;
    if (contractAddress != null) {
      const asset: ?Asset = await Asset.findOne({
        type: "erc20",
        contractAddress: contractAddress
      });

      if (asset == null || asset.ABI == null) {
        throw `erc20 asset not found ${contractAddress}`;
      }

      const {
        ABI,
        attr: { decimals }
      } = asset;
      if (ABI == null || decimals == null) {
        throw `Erc20 attributes missing for ${asset.attr.ticker}`;
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
        gasPrice: txn.gasPriceBN,
        toAddress: txn.attr.to,
        privateKey,
        transferAmount: new BigNumber(txn.attr.value)
      });
    } else {
      const session = new EthSession({
        session: web3Session,
        fromAddress: txn.attr.from
      });

      session.transferTo({
        value: txn.valueBN,
        nonce: txn.attr.nonce,
        gasLimit: txn.gasLimitBN,
        gasPrice: txn.gasPriceBN,
        toAddress: txn.attr.to,
        privateKey
      });
    }
  }

  @handler()
  static async retryEthTransaction(transationId: number) {
    const session = Web3Session.createSession();
    const txn: ?EthereumTransaction = await EthereumTransaction.findById(
      transationId
    );

    if (txn == null) {
      throw `transaction not found ${transationId}`;
    }

    if (txn.attr.blockNumber != null) {
      console.warn(`transaction already confirmed ${txn.attr.id}`);
      return;
    }

    // Add 10gwei to gas price and re-broadcast
    const increment = new BigNumber(session.web3.utils.toWei(10, "gwei"));
    const newGasPrice = txn.gasPriceBN.plus(increment);
    await txn.update({
      gasPrice: newGasPrice.toString(),
      numRetries: txn.attr.numRetries + 1
    });

    console.log("re-sending eth transaction");
    this.broadcastEthTransaction.publish(transationId);
  }
}
