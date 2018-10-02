import "jest";
import web3 from "web3";
import axios from "axios";

import { BigNumber } from "bignumber.js";
import { getPriceForAmount, trade, withdraw } from "../IdexApi";
import EthKey from "../../pkey-service/EthKey";
import CannotFillOrderError from "../errors";

jest.mock("axios");

const IDEX_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";
const WALLET_ADDRESS = "0x1234500000000000000000000000000000000000";

const TOKEN_CURRENCY_INFO = {
  name: "LINK",
  decimals: "18",
  address: "0x9934567890123456789012345678901234567899"
};

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
        price: "1.2",
        amount: "3131.164000000000131072",
        orderHash: "qwerty"
      }
    ]
  }
};

// getPriceForAmount() tests.
test("get price for buy amount that partially fills one ask", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  const expectedPrice = BigNumber(0.1).multipliedBy(1.03);
  const actualPrice = await getPriceForAmount("LINK", "1", "buy");
  expect(actualPrice).toEqual(expectedPrice);
});

test("get price for buy amount that fills one ask", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  const expectedPrice = BigNumber(0.3).multipliedBy(1.03);
  const actualPrice = await getPriceForAmount("LINK", "3", "buy");
  expect(actualPrice).toEqual(expectedPrice);
});

test("get price for buy amount that fills 1 ask and a partial ask", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  const expectedPrice = BigNumber(0.5).multipliedBy(1.03);
  const actualPrice = await getPriceForAmount("LINK", "4", "buy");
  expect(actualPrice).toEqual(expectedPrice);
});

test("get price for buy amount that fills multiple asks", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  const expectedPrice = BigNumber(1.7).multipliedBy(1.03);
  const actualPrice = await getPriceForAmount("LINK", "10", "buy");
  expect(actualPrice).toEqual(expectedPrice);
});

test("get price for buy amount that cannot be filled", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  await expect(getPriceForAmount("LINK", "11", "buy")).rejects.toThrowError(
    "Unable to fill order for token LINK on IDEX. Can only fill 10/11."
  );
});

test("get price for sell amount that partially fills one bid", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  const expectedPrice = BigNumber(1.2).multipliedBy(1.03);
  const actualPrice = await getPriceForAmount("LINK", "1", "sell");
  expect(actualPrice).toEqual(expectedPrice);
});

// trade() tests
test("correct args for complete multi-order trade()", async () => {
  const spy = jest.spyOn(axios, "post");
  await trade(
    ORDER_BOOK_RESPONSE.data.asks,
    /* amountBuy */ "10",
    /* tokenFillPrecision */ 18,
    /* expectedAmountFill */ "1.7",
    /* walletAddr */ WALLET_ADDRESS,
    /* nonce */ 0
  );
  const expectedTrade1 = {
    orderHash: "0xb7f696c344e6573c2be6e5a25b0eb7b1f510f490",
    // amount is the wei price, which is ask.price * ask.amount
    amount: web3.utils.toWei("0.3"),
    address: WALLET_ADDRESS,
    nonce: 0,
    v: expect.any(Number),
    r: expect.stringMatching("0x*"),
    s: expect.stringMatching("0x*")
  };
  const expectedTrade2 = {
    orderHash: "0xc7f696c344e6573c2be6e5a25b0eb7b1f510f491",
    // amount is the wei price, which is ask.price * ask.amount
    amount: web3.utils.toWei("1.4"),
    address: WALLET_ADDRESS,
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
    /* amountBuy */ "8",
    /* tokenFillPrecision */ 18,
    /* expectedAmountFill */ "1.3",
    /* walletAddr */ WALLET_ADDRESS,
    /* nonce */ 0
  );
  const expectedTrade1 = expect.objectContaining({
    orderHash: "0xb7f696c344e6573c2be6e5a25b0eb7b1f510f490",
    // amount is the wei price, which is ask.price * ask.amount
    amount: web3.utils.toWei("0.3"),
    address: WALLET_ADDRESS,
    nonce: 0,
    v: expect.any(Number),
    r: expect.stringMatching("0x*"),
    s: expect.stringMatching("0x*")
  });
  const expectedTrade2 = expect.objectContaining({
    orderHash: "0xc7f696c344e6573c2be6e5a25b0eb7b1f510f491",
    // amount is the wei price, which is ask.price * ask.amount
    amount: web3.utils.toWei("1.0"),
    address: WALLET_ADDRESS,
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

test("correct args for withdraw()", async () => {
  const spy = jest.spyOn(axios, "post");

  await withdraw(
    IDEX_CONTRACT_ADDRESS,
    /* amount */ "0.2",
    TOKEN_CURRENCY_INFO,
    /* nonce */ 0,
    WALLET_ADDRESS
  );

  const expected = expect.objectContaining({
    // Eth to Wei and the provided token have same precision.
    amount: web3.utils.toWei("0.2"),
    token: TOKEN_CURRENCY_INFO.address,
    address: WALLET_ADDRESS,
    nonce: 0,
    v: expect.any(Number),
    r: expect.stringMatching("0x*"),
    s: expect.stringMatching("0x*")
  });
  expect(spy).toHaveBeenCalledWith(
    "https://api.idex.market/withdraw",
    expected
  );
  spy.mockRestore();
});
