import "jest";
import axios from "axios";

import { BigNumber } from "bignumber.js";
import { getPriceForAmount, trade } from "../IdexApi";
import EthKey from "../../pkey-service/EthKey";
import CannotFillOrderError from "../errors";

jest.mock("axios");

const ORDER_BOOK_RESPONSE = {
  data: {
    asks: [
      {
        price: "0.1",
        amount: "3",
        orderHash: "0xb7f696c344e6573c2be6e5a25b0eb7b1f510f490"
      },
      {
        price: "0.2",
        amount: "7",
        orderHash: "0xc7f696c344e6573c2be6e5a25b0eb7b1f510f491"
      }
    ],
    bids: [
      {
        price: "0.000303401295904014",
        amount: "3131.164000000000131072",
        orderHash: "qwerty"
      }
    ]
  }
};

// getPriceForAmount() tests.
test("get price for amount that partially fills one ask", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  const expectedPrice = BigNumber(0.1).multipliedBy(1.03);
  const actualPrice = await getPriceForAmount("LINK", 1);
  expect(actualPrice).toEqual(expectedPrice);
});

test("get price for amount that fills one ask", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  const expectedPrice = BigNumber(0.3).multipliedBy(1.03);
  const actualPrice = await getPriceForAmount("LINK", 3);
  expect(actualPrice).toEqual(expectedPrice);
});

test("get price for amount that fills 1 ask and a partial ask", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  const expectedPrice = BigNumber(0.5).multipliedBy(1.03);
  const actualPrice = await getPriceForAmount("LINK", 4);
  expect(actualPrice).toEqual(expectedPrice);
});

test("get price for amount that fills multiple asks", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  const expectedPrice = BigNumber(1.7).multipliedBy(1.03);
  const actualPrice = await getPriceForAmount("LINK", 10);
  expect(actualPrice).toEqual(expectedPrice);
});

test("get price for amount that cannot be filled", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  await expect(getPriceForAmount("LINK", 11)).rejects.toThrowError(
    "Unable to fill order for token LINK on IDEX. Can only fill 10/11. checkOnly: true"
  );
});

// trade() tests
test("correct args for multi-order trade()", async () => {
  const spy = jest.spyOn(axios, "post");
  await trade(
    ORDER_BOOK_RESPONSE.data.asks,
    /* amount */ 10,
    /* walletAddr */ "0x1234500000000000000000000000000000000000",
    /* nonce */ 0
  );
  const expectedTrade1 = {
    orderHash: "0xb7f696c344e6573c2be6e5a25b0eb7b1f510f490",
    amount: "3",
    address: "0x1234500000000000000000000000000000000000",
    nonce: 0,
    v: expect.any(Number),
    r: expect.stringMatching("0x*"),
    s: expect.stringMatching("0x*")
  };
  const expectedTrade2 = {
    orderHash: "0xc7f696c344e6573c2be6e5a25b0eb7b1f510f491",
    amount: "7",
    address: "0x1234500000000000000000000000000000000000",
    nonce: 1,
    v: expect.any(Number),
    r: expect.stringMatching("0x*"),
    s: expect.stringMatching("0x*")
  };
  expect(spy).toHaveBeenCalledWith("https://api.idex.market/trade", [
    expectedTrade1,
    expectedTrade2
  ]);
  spy.mockRestore();
});

test("correct args for partial multi-order trade()", async () => {
  const spy = jest.spyOn(axios, "post");
  await trade(
    ORDER_BOOK_RESPONSE.data.asks,
    /* amount */ 8,
    /* walletAddr */ "0x1234500000000000000000000000000000000000",
    /* nonce */ 0
  );
  const expectedTrade1 = expect.objectContaining({
    orderHash: "0xb7f696c344e6573c2be6e5a25b0eb7b1f510f490",
    amount: "3",
    address: "0x1234500000000000000000000000000000000000",
    nonce: 0,
    v: expect.any(Number),
    r: expect.stringMatching("0x*"),
    s: expect.stringMatching("0x*")
  });
  const expectedTrade2 = expect.objectContaining({
    orderHash: "0xc7f696c344e6573c2be6e5a25b0eb7b1f510f491",
    amount: "5",
    address: "0x1234500000000000000000000000000000000000",
    nonce: 1,
    v: expect.any(Number),
    r: expect.stringMatching("0x*"),
    s: expect.stringMatching("0x*")
  });
  expect(spy).toHaveBeenCalledWith(
    "https://api.idex.market/trade",
    expect.arrayContaining([expectedTrade1, expectedTrade2])
  );
  spy.mockRestore();
});
