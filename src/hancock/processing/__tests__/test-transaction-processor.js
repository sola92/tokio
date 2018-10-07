//@flow
import "jest";
import { BigNumber } from "bignumber.js";
import { createApp } from "src/hancock/server";
import request from "supertest";

import { createUser, sleep } from "src/test/util";

import Web3Session from "src/lib/ethereum/Web3Session";
import {
  User,
  Account,
  Asset,
  EthereumTransaction,
  AccountBalance
} from "src/hancock/models";
import EthereumBlockScanner from "src/hancock/lib/EthereumBlockScanner";
import TransactionProcessor from "src/hancock/processing/TransactionProcessor";

require("dotenv").config();
const TEST_ACCOUNT: string = process.env.ROPSTEN_ACCOUNT || "";

jest.setTimeout(60 * 60 * 1000);

test("POST eth blockchain transaction", async () => {
  const hancock = createApp();
  const scanner = new EthereumBlockScanner();
  scanner.start();

  const asset = await Asset.fromTicker("tst");
  const user = await createUser({})
    .withAssetBalance({
      asset,
      address: TEST_ACCOUNT,
      balance: new BigNumber(5)
    })
    .build();

  const session = await Web3Session.createSession();
  const web3Account = session.createAccount(session.randomHex(32));

  const res = await request(hancock)
    .post(`/transactions/${user.id}/${asset.attr.ticker}`)
    .send({
      to: web3Account.address,
      from: TEST_ACCOUNT,
      value: "1"
    });

  // console.log(res);
  expect(res.statusCode).toBe(200);
  const txnId: number = res.body.id;
  await TransactionProcessor.broadcastEthTransaction(txnId);
  await sleep(5 * 60 * 1000);

  const transaction = await EthereumTransaction.byId(txnId);
  expect(transaction).not.toBeNull();
  if (transaction) {
    expect(transaction.attr.state).toBe("confirmed");
  }
});
