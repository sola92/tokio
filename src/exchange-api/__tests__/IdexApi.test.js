import "jest";
import axios from "axios";

import { getPriceForAmount } from "../IdexApi";
import CannotFillOrderError from "../errors";

jest.mock("axios");

const ORDER_BOOK_RESPONSE = {
  data: {
    asks: [
      {
        price: "0.1",
        amount: "3"
      },
      {
        price: "0.2",
        amount: "7"
      }
    ],
    bids: [
      {
        price: "0.000303401295904014",
        amount: "3131.164000000000131072"
      }
    ]
  }
};

test("get price for amount that partially fills one ask", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  const expectedPrice = 0.1 * 1.03;
  const actualPrice = await getPriceForAmount("LINK", 1);
  expect(actualPrice).toBe(expectedPrice);
});

test("get price for amount that fills one ask", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  const expectedPrice = 0.3 * 1.03;
  const actualPrice = await getPriceForAmount("LINK", 3);
  expect(actualPrice).toBe(expectedPrice);
});

test("get price for amount that fills 1 ask and a partial ask", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  const expectedPrice = 0.5 * 1.03;
  const actualPrice = await getPriceForAmount("LINK", 4);
  expect(actualPrice).toBe(expectedPrice);
});

test("get price for amount that fills multiple asks", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  const expectedPrice = 1.7 * 1.03;
  const actualPrice = await getPriceForAmount("LINK", 10);
  expect(actualPrice).toBe(expectedPrice);
});

test("get price for amount that cannot be filled", async () => {
  axios.post.mockImplementation(() => Promise.resolve(ORDER_BOOK_RESPONSE));
  await expect(getPriceForAmount("LINK", 11)).rejects.toThrowError(
    "Unable to fill order for token LINK on IDEX. Can only fill 10/11. checkOnly: true"
  );
});
