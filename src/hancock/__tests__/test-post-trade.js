//@flow
import "jest";
import { createApp } from "src/hancock/server";
import request from "supertest";
const util = require("util");

import { NotFoundError, InvalidParameterError } from "../errors";

test("/trade fails with no args", async () => {
  const hancock = createApp();
  const res = await request(hancock).post("/trade/LINK/ETH");
  expect(res.statusCode).toBe(InvalidParameterError.httpResponseCode);
  expect(res.body.code).toBe(InvalidParameterError.code);
});

test("/trade fails without user id", async () => {
  const hancock = createApp();
  const res = await request(hancock)
    .post("/trade/LINK/ETH")
    .send({ amount: "10", amountToken: "LINK", expectedPrice: "1.00" });
  expect(res.statusCode).toBe(InvalidParameterError.httpResponseCode);
  expect(res.body.code).toBe(InvalidParameterError.code);
});

test("/trade fails without all required args", async () => {
  const hancock = createApp();
  // no amount
  let res = await request(hancock)
    .post("/trade/LINK/ETH")
    .send({ userId: "1", amountToken: "LINK", expectedPrice: "1.00" });
  expect(res.statusCode).toBe(InvalidParameterError.httpResponseCode);
  expect(res.body.code).toBe(InvalidParameterError.code);

  // no amountToken
  res = await request(hancock)
    .post("/trade/LINK/ETH")
    .send({ userId: "1", amount: "10", expectedPrice: "1.00" });
  expect(res.statusCode).toBe(InvalidParameterError.httpResponseCode);
  expect(res.body.code).toBe(InvalidParameterError.code);

  // no expectedPrice
  res = await request(hancock)
    .post("/trade/LINK/ETH")
    .send({ userId: "1", amount: "10", amountToken: "LINK" });
  expect(res.statusCode).toBe(InvalidParameterError.httpResponseCode);
  expect(res.body.code).toBe(InvalidParameterError.code);
});

test("valid /trade", async () => {
  const hancock = createApp();
  const res = await request(hancock)
    .post("/trade/LINK/ETH")
    .send({
      userId: "1",
      amount: "10",
      amountToken: "LINK",
      expectedPrice: "1.00"
    });
  expect(res.statusCode).toBe(200);
});
