//@flow
import "jest";
import "./base";

import { BigNumber } from "bignumber.js";

import EthSession from "src/lib/ethereum/EthSession";
import Web3Session from "src/lib/ethereum/Web3Session";
import EthereumTransaction from "../models/EthereumTransaction";
import TransactionProcessor from "../processing/TransactionProcessor";

require("dotenv").config();

const ROPSTEN_ACCOUNT: string = process.env.ROPSTEN_ACCOUNT || "";

jest.setTimeout(1000000);

test("send ETH", async () => {
  // const session = Web3Session.createRopstenSession();
  // const recipient = await session.createAccount(session.randomHex(32));
  //
  // const chainId = await session.getChainId();
  // const gasPrice = await session.getGasPrice();
  // const lastestBlock = await session.getLatestBlock();
  //
  // const txn: EthereumTransaction = await EthereumTransaction.query().insert({
  //   to: recipient.address,
  //   from: ROPSTEN_ACCOUNT,
  //   value: new BigNumber("1e-18").toString(),
  //   gasLimit: new BigNumber(lastestBlock.gasLimit).toString(),
  //   gasPrice: gasPrice.toString(),
  //   numRetries: 0,
  //   chainId: chainId
  // });
  //
  // TransactionProcessor.broadcastEthTransaction(txn.attr.id);
});
