//@flow
import "jest";
import { createApp } from "src/hancock/server";
import request from "supertest";
const util = require("util");

import { NotFoundError, InvalidParameterError } from "../errors";

// TODO(sujen) check that the error is related to invalid ticker.
// and expect the error to be a 400.
test("GET /price with invalid ticker", async () => {
  const hancock = createApp();
  const res = await request(hancock).get(
    "/price/xyz/asdlkj?amount=10&amountToken=xyz"
  );
  //console.log("response: " + util.inspect(res));
  expect(res.statusCode).toBe(400);
  expect(res.body.code).toBe(400);
});

test("GET valid /price", async () => {
  const hancock = createApp();
  const res = await request(hancock).get(
    "/price/LINK/ETH?amount=10&amountToken=LINK"
  );
  expect(res.statusCode).toBe(200);
  expect(res.body).toMatchObject(
    expect.objectContaining({
      amount: "10",
      avgUnitPrice: expect.any(String),
      buyToken: "LINK",
      sellToken: "ETH",
      price: expect.any(String),
      exchange: "IDEX"
    })
  );
});

test("GET /price fails with no amountToken", async () => {
  const hancock = createApp();
  const res = await request(hancock).get("/price/ETH/LINK?amount=10");
  expect(res.statusCode).toBe(InvalidParameterError.httpResponseCode);
  expect(res.body.code).toBe(InvalidParameterError.code);
});

test("GET valid /price for selling token and buying ETH", async () => {
  const hancock = createApp();
  const res = await request(hancock).get(
    "/price/ETH/LINK?amount=10&amountToken=LINK"
  );
  expect(res.statusCode).toBe(200);
  expect(res.body).toMatchObject(
    expect.objectContaining({
      amount: "10",
      avgUnitPrice: expect.any(String),
      buyToken: "ETH",
      sellToken: "LINK",
      price: expect.any(String)
    })
  );
});

test("GET /price with no amount", async () => {
  const hancock = createApp();
  const res = await request(hancock).get("/price/LINK/ETH");
  expect(res.statusCode).toBe(InvalidParameterError.httpResponseCode);
  expect(res.body.code).toBe(InvalidParameterError.code);
});

test("GET /price with invalid amount", async () => {
  const hancock = createApp();
  const res = await request(hancock).get(
    "/price/LINK/ETH?amount=xxx&amountToken=LINK"
  );
  expect(res.statusCode).toBe(InvalidParameterError.httpResponseCode);
  expect(res.body.code).toBe(InvalidParameterError.code);
});
