//@flow
import "jest";
import { BigNumber } from "bignumber.js";
import { createApp } from "src/hancock/server";
import request from "supertest";

import { createUser } from "src/test/util";

import Web3Session from "src/lib/ethereum/Web3Session";
import TransactionProcessor from "src/hancock/processing/TransactionProcessor";

require("dotenv").config();
const TEST_ACCOUNT: string = process.env.ROPSTEN_ACCOUNT || "";

jest.setTimeout(100000);

test("POST eth blockchain transaction", async () => {
  const hancock = createApp();
  const user = await createUser({})
    .withEthAccountBalance({
      address: TEST_ACCOUNT,
      balance: new BigNumber(1)
    })
    .build();

  const session = await Web3Session.createSession();
  const web3Account = session.createAccount(session.randomHex(32));

  const res = await request(hancock)
    .post(`/transactions/${user.id}/eth`)
    .send({
      to: web3Account.address,
      from: TEST_ACCOUNT,
      value: Web3Session.ONE_WEI.toString()
    });

  expect(res.statusCode).toBe(200);
});
