import "jest";
const util = require("util");
import IdexClient from "../IdexClient";
import IdexApi, {
  getIdexContractAddress,
  getNextNonce,
  getOrdersForAmount,
  getCurrencies,
  postOrder,
  trade,
  withdraw
} from "../IdexApi";
import Web3Session from "../../lib/ethereum/Web3Session";

jest.mock("../IdexApi");

const WALLET_ADDR = "0x123456c344e6573c2be6e5a25b0eb7b1f510f499";
const INITIAL_NONCE = 3;
const IDEX_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";
const ETH_CURRENCY_INFO = {
  name: "Ether",
  decimals: 18,
  address: "0x0000000000000000000000000000000000000000"
};
const LINK_CURRENCY_INFO = {
  name: "ChainLink",
  decimals: 18,
  address: "0x9934567890123456789012345678901234567899"
};

beforeAll(() => {
  getNextNonce.mockImplementation(() => INITIAL_NONCE);
  getIdexContractAddress.mockImplementation(() => IDEX_CONTRACT_ADDRESS);
  const currencies = {};
  currencies.ETH = ETH_CURRENCY_INFO;
  currencies.LINK = LINK_CURRENCY_INFO;
  getCurrencies.mockImplementation(() => currencies);
});

test("getNonce() is fetched and increments properly", async () => {
  let client = new IdexClient(WALLET_ADDR);
  expect(await client.getNonce()).toEqual(INITIAL_NONCE);

  client.incrementNonce();
  expect(await client.getNonce()).toEqual(INITIAL_NONCE + 1);

  client.incrementNonce(3);
  expect(await client.getNonce()).toEqual(INITIAL_NONCE + 1 + 3);
});

test("withdrawToken() calls IdexApi.withdraw() with correct args", async () => {
  let client = new IdexClient(WALLET_ADDR);
  await client.withdrawToken("LINK", "1000");
  expect(withdraw).toBeCalledWith({
    amount: "1000",
    contractAddr: IDEX_CONTRACT_ADDRESS,
    nonce: INITIAL_NONCE,
    tokenCurrencyInfo: LINK_CURRENCY_INFO,
    walletAddr: WALLET_ADDR
  });
  expect(await client.getNonce()).toEqual(INITIAL_NONCE + 1);
});

test("postBuyOrder() calls IdexApi.postOrder() with correct args", async () => {
  let client = new IdexClient(WALLET_ADDR);
  await client.postBuyOrder({
    tokenTicker: "LINK",
    price: "0.01",
    amount: "1000"
  });
  expect(postOrder).toBeCalledWith({
    amountBuyDecimals: "1000000000000000000000",
    amountSellDecimals: "10000000000000000000",
    contractAddr: IDEX_CONTRACT_ADDRESS,
    nonce: INITIAL_NONCE,
    tokenBuyAddr: LINK_CURRENCY_INFO.address,
    tokenSellAddr: ETH_CURRENCY_INFO.address,
    walletAddr: WALLET_ADDR
  });
  expect(await client.getNonce()).toEqual(INITIAL_NONCE + 1);
});

test("buyToken() calls IdexApi.trade() with correct args", async () => {
  let client = new IdexClient(WALLET_ADDR);
  const order1 = {
    price: "0.01",
    amount: "1000",
    amountBuy: "1000000000000000000000",
    type: "buy",
    orderHash: "0x121ac23"
  };
  getOrdersForAmount.mockImplementation(() => ({
    totalPrice: "10",
    type: "buy",
    orders: [order1]
  }));
  await client.buyToken({
    tokenTicker: "LINK",
    amount: "1000",
    expectedTotalPrice: "10",
    priceTolerance: "0.01"
  });
  expect(trade).toBeCalledWith({
    amountBuy: "1000",
    expectedAmountFill: "10",
    nonce: INITIAL_NONCE,
    orders: [order1],
    tokenFillDecimals: 18,
    walletAddr: WALLET_ADDR
  });
  expect(await client.getNonce()).toEqual(INITIAL_NONCE + 1);
});

test("sellToken() calls IdexApi.trade() with correct args", async () => {
  let client = new IdexClient(WALLET_ADDR);
  const order1 = {
    price: "0.01",
    amount: "1000",
    amountBuy: "1000000000000000000000",
    type: "sell",
    orderHash: "0x121ac23"
  };
  getOrdersForAmount.mockImplementation(() => ({
    totalPrice: "10",
    type: "sell",
    orders: [order1]
  }));
  await client.sellToken({
    tokenTicker: "LINK",
    amount: "1000",
    expectedTotalPrice: "10",
    priceTolerance: "0.01"
  });
  expect(trade).toBeCalledWith({
    amountBuy: "1000",
    expectedAmountFill: "10",
    nonce: INITIAL_NONCE,
    orders: [order1],
    tokenFillDecimals: 18,
    walletAddr: WALLET_ADDR
  });
  expect(await client.getNonce()).toEqual(INITIAL_NONCE + 1);
});

test("buyToken() throws error when price has increased too much", async () => {
  let client = new IdexClient(WALLET_ADDR);
  const order1 = {
    price: "0.01",
    amount: "1000",
    amountBuy: "1000000000000000000000",
    type: "buy",
    orderHash: "0x121ac23"
  };
  getOrdersForAmount.mockImplementation(() => ({
    totalPrice: "10",
    type: "buy",
    orders: [order1]
  }));
  await expect(
    client.buyToken({
      tokenTicker: "LINK",
      amount: "1000",
      expectedTotalPrice: "8",
      priceTolerance: "0.01"
    })
  ).rejects.toThrowError();
  // nonce shouldn't have increased, as there was no successful interaction with
  // IDEX contract.
  expect(await client.getNonce()).toEqual(INITIAL_NONCE);
});

test("IdexClient retries if IDEX says nonce is wrong.", async () => {
  let client = new IdexClient(WALLET_ADDR);
  // make sure withdraw isn't retried if there is no error.
  withdraw.mockClear();
  await client.withdrawToken("LINK", "1000");
  expect(withdraw).toHaveBeenCalledTimes(1);

  // Verify that withdraw is not retried if error is not nonce related.
  withdraw.mockClear();
  withdraw.mockImplementation(() => {
    throw new Error();
  });
  try {
    await client.withdrawToken("LINK", "1000");
  } catch (error) {}
  expect(withdraw).toHaveBeenCalledTimes(1);

  // Verify that withdraw is retried once if error is nonce related.
  withdraw.mockClear();
  withdraw.mockImplementation(() => {
    throw { response: { data: { error: "Nonce" } } };
  });
  try {
    await client.withdrawToken("LINK", "1000");
  } catch (error) {}

  expect(withdraw).toHaveBeenCalledTimes(2);
});
