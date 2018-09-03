//@flow
import "jest";
import { initApp } from "./base";
import request from "supertest";

import EthereumTransaction from "../models/EthereumTransaction";
import { NotFoundError, InvalidParameterError } from "../errors";

test("GET /transaction with invalid ticker", async () => {
  const app = initApp();
  const res = await request(app).get("/transactions/xyz-asdlkj");
  expect(res.statusCode).toBe(NotFoundError.responseCode);
  expect(res.body.code).toBe(NotFoundError.code);
});

test("GET /transaction with invalid ticker (2)", async () => {
  const app = initApp();
  const res = await request(app).get("/transactions/eth-12123");
  expect(res.statusCode).toBe(NotFoundError.responseCode);
  expect(res.body.code).toBe(NotFoundError.code);
});

test("GET /transaction with invalid ticker (4)", async () => {
  const app = initApp();
  return;
  const txn: EthereumTransaction = await EthereumTransaction.query().insert({
    to: "to",
    from: "from",
    nonce: 0,
    chainId: 0,
    data: "",
    hash: "0x1fc5384c72c90290b96177003af53c1720d9dda9a697ddb944dc435c95ea576c",
    value: "0.1",
    gasPrice: "0.1",
    gasLimit: "0.1",
    ticker: "ETH"
  });

  await txn.refresh();

  console.log(txn.publicId);
  const res = await request(app).get(`/transactions/${txn.publicId}`);
  expect(res.statusCode).toBe(200);
  expect(res.body.code).toBe(txn.toJSON());
});
