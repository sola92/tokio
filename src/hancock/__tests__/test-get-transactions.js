//@flow
import "jest";
import { createApp } from "src/hancock/server";
import request from "supertest";

import EthereumTransaction from "../models/EthereumTransaction";
import Web3Session from "src/lib/ethereum/Web3Session";
import { NotFoundError } from "../errors";

import Asset from "../models/Asset";

test("GET /transaction with invalid ticker", async () => {
  const hancock = createApp();
  const res = await request(hancock).get("/transactions/xyz-asdlkj");
  expect(res.statusCode).toBe(NotFoundError.httpResponseCode);
  expect(res.body.code).toBe(NotFoundError.code);
});

test("GET /transaction with invalid transaction id", async () => {
  const hancock = createApp();
  const res = await request(hancock).get("/transactions/eth-12123");
  expect(res.statusCode).toBe(NotFoundError.httpResponseCode);
  expect(res.body.code).toBe(NotFoundError.code);
});

// test("GET /transaction on a valid transaction", async () => {
//   const hancock = createApp();
//   const session = Web3Session.createSession();
//   const asset = await Asset.fromTicker("eth");
//   const txn: EthereumTransaction = await EthereumTransaction.insert({
//     to: "to",
//     from: "from",
//     nonce: 0,
//     chainId: 0,
//     state: "pending",
//     hash: session.randomHex(42),
//     value: "0.1",
//     gasPriceWei: "0.1",
//     gasLimit: "0.1",
//     assetId: asset.id
//   });
//
//   const res = await request(hancock).get(`/transactions/${txn.publicId}`);
//   expect(res.statusCode).toBe(200);
//   expect(res.body.hash).toBe(txn.attr.hash);
// });
