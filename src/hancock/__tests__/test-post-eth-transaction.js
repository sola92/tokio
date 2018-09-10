//@flow
import "jest";
import { createApp } from "src/hancock/server";
import request from "supertest";

import Web3Session from "src/lib/ethereum/Web3Session";
import EthereumAccount from "../models/EthereumAccount";
import {
  InvalidBalanceError,
  UnknownAccountError,
  InvalidParameterError,
  InvalidRecipientError
} from "../errors";

require("dotenv").config();

jest.setTimeout(10000);

const TEST_ACCOUNT: string = process.env.ROPSTEN_ACCOUNT || "";

test("POST /transaction with invalid body", async () => {
  const hancock = createApp();
  for (const param of ["to", "from", "value"]) {
    const res = await request(hancock)
      .post("/transactions/eth")
      .send({
        [param]: param
      });

    expect(res.statusCode).toBe(InvalidParameterError.responseCode);
    expect(res.body.code).toBe(InvalidParameterError.code);
  }
});

test("POST /transaction with invalid ticker", async () => {
  const hancock = createApp();
  const session = await Web3Session.createSession();
  const web3Account = session.createAccount(session.randomHex(32));

  const res = await request(hancock)
    .post("/transactions/xzy")
    .send({
      to: web3Account.address,
      from: TEST_ACCOUNT,
      value: "0.01"
    });

  expect(res.statusCode).toBe(InvalidParameterError.responseCode);
  expect(res.body.code).toBe(InvalidParameterError.code);
});

test("POST /transaction with same sender and recipient", async () => {
  const hancock = createApp();
  const res = await request(hancock)
    .post("/transactions/eth")
    .send({
      to: TEST_ACCOUNT,
      from: TEST_ACCOUNT,
      value: "0.01"
    });

  expect(res.statusCode).toBe(InvalidRecipientError.responseCode);
  expect(res.body.code).toBe(InvalidRecipientError.code);
});

test("POST /transaction with unknown sender account", async () => {
  const hancock = createApp();
  const session = await Web3Session.createSession();
  const web3Account = session.createAccount(session.randomHex(32));
  const web3Account2 = session.createAccount(session.randomHex(32));

  const res = await request(hancock)
    .post("/transactions/eth")
    .send({
      to: web3Account.address,
      from: web3Account2.address,
      value: "2000000"
    });

  expect(res.statusCode).toBe(UnknownAccountError.responseCode);
  expect(res.body.code).toBe(UnknownAccountError.code);
});

test("POST /transaction with insufficient balance", async () => {
  const hancock = createApp();
  const account = await EthereumAccount.findByAddress(TEST_ACCOUNT);
  expect(account).not.toBeNull();

  const res = await request(hancock)
    .post("/transactions/eth")
    .send({
      to: "to",
      from: TEST_ACCOUNT,
      value: "20000000"
    });

  expect(res.statusCode).toBe(InvalidBalanceError.responseCode);
  expect(res.body.code).toBe(InvalidBalanceError.code);
});

test("POST /transaction", async () => {
  const hancock = createApp();
  const account = await EthereumAccount.findByAddress(TEST_ACCOUNT);
  const session = await Web3Session.createSession();
  const web3Account = session.createAccount(session.randomHex(32));
  expect(account).not.toBeNull();

  const res = await request(hancock)
    .post("/transactions/eth")
    .send({
      to: web3Account.address,
      from: TEST_ACCOUNT,
      value: Web3Session.ONE_WEI.toString()
    });

  // console.log(res);
  expect(res.statusCode).toBe(200);
});
