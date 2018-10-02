//@flow
import "jest";
import { BigNumber } from "bignumber.js";
import { createApp } from "src/hancock/server";
import request from "supertest";

import { randomId, createUserWithRandomEthAccount } from "src/test/util";

import Web3Session from "src/lib/ethereum/Web3Session";

import Asset from "src/hancock/models/Asset";

import {
  InvalidBalanceError,
  UnknownAccountError,
  InvalidParameterError,
  InvalidRecipientError
} from "../errors";

require("dotenv").config();

jest.setTimeout(100000);

test("POST /transaction with invalid body", async () => {
  const user = await createUserWithRandomEthAccount({
    balance: new BigNumber(10),
    houseBalance: new BigNumber(0.1)
  });

  const hancock = createApp();
  for (const param of ["to", "from", "value"]) {
    const res = await request(hancock)
      .post(`/transactions/${user.attr.id}/eth`)
      .send({
        [param]: param
      });

    expect(res.statusCode).toBe(InvalidParameterError.responseCode);
    expect(res.body.code).toBe(InvalidParameterError.code);
  }
});

test("POST /transaction with invalid ticker", async () => {
  const hancock = createApp();
  const user = await createUserWithRandomEthAccount({
    balance: new BigNumber(10),
    houseBalance: new BigNumber(0.1)
  });
  const account = user.accounts[0];
  const session = await Web3Session.createSession();
  const web3Account = session.createAccount(session.randomHex(32));

  const res = await request(hancock)
    .post(`/transactions/${user.attr.id}/xzy`)
    .send({
      to: web3Account.address,
      from: account.attr.address,
      value: "0.01"
    });

  expect(res.statusCode).toBe(InvalidParameterError.responseCode);
  expect(res.body.code).toBe(InvalidParameterError.code);
});

test("POST /transaction with same sender and recipient", async () => {
  const hancock = createApp();
  const user = await createUserWithRandomEthAccount({
    balance: new BigNumber(10),
    houseBalance: new BigNumber(0.1)
  });
  const account = user.accounts[0];
  const res = await request(hancock)
    .post(`/transactions/${user.attr.id}/eth`)
    .send({
      to: account.attr.address,
      from: account.attr.address,
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
    .post(`/transactions/${randomId()}/eth`)
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
  const user = await createUserWithRandomEthAccount({
    balance: new BigNumber(10),
    houseBalance: new BigNumber(0.1)
  });
  const account = user.accounts[0];

  const eth = await Asset.fromTicker("eth");
  const balance: BigNumber = await user.getAvailableBalance(eth.attr.id);
  expect(balance.toNumber()).toBe(10);

  const res = await request(hancock)
    .post(`/transactions/${user.attr.id}/eth`)
    .send({
      to: "to",
      from: account.attr.address,
      value: "20000000"
    });

  expect(res.statusCode).toBe(InvalidBalanceError.responseCode);
  expect(res.body.code).toBe(InvalidBalanceError.code);

  const newBalance: BigNumber = await user.getAvailableBalance(eth.attr.id);
  expect(newBalance.toNumber()).toBe(10);
});

test("POST /transaction", async () => {
  const hancock = createApp();
  const user = await createUserWithRandomEthAccount({
    balance: new BigNumber(10),
    houseBalance: new BigNumber(0.5)
  });
  const account = user.accounts[0];

  const eth = await Asset.fromTicker("eth");
  const balance: BigNumber = await user.getAvailableBalance(eth.attr.id);
  expect(balance.toNumber()).toBe(10);

  const session = await Web3Session.createSession();
  const web3Account = session.createAccount(session.randomHex(32));

  const res = await request(hancock)
    .post(`/transactions/${user.attr.id}/eth`)
    .send({
      to: web3Account.address,
      from: account.attr.address,
      value: "1"
    });

  expect(res.statusCode).toBe(200);

  const newBalance: BigNumber = await user.getAvailableBalance(eth.attr.id);
  expect(newBalance.toNumber()).toBe(9);
});

test("POST concurrent /transaction calls. Only one should succeed", async () => {
  const hancock = createApp();
  const user = await createUserWithRandomEthAccount({
    balance: new BigNumber(10),
    houseBalance: new BigNumber(0.1)
  });
  const account = user.accounts[0];

  const eth = await Asset.fromTicker("eth");
  const balance: BigNumber = await user.getAvailableBalance(eth.attr.id);
  expect(balance.toNumber()).toBe(10);

  const session = await Web3Session.createSession();
  const web3Account = session.createAccount(session.randomHex(32));

  const postRequest = async () =>
    await request(hancock)
      .post(`/transactions/${user.attr.id}/eth`)
      .send({
        to: web3Account.address,
        from: account.attr.address,
        value: "10"
      });

  const numRequests = 10;
  const spamRequests = new Array(numRequests)
    .fill(undefined)
    .map(() => postRequest());
  const responses = await Promise.all(spamRequests);
  const responseCodes = responses.map(res => res.statusCode);

  // Should be one success.
  expect(responseCodes.filter(c => c == 200)).toEqual([200]);
  // Rest should have failed
  expect(responseCodes.filter(c => c != 200).length).toBe(numRequests - 1);

  const newBalance: BigNumber = await user.getAvailableBalance(eth.attr.id);
  expect(newBalance.toNumber()).toBe(0);
});
