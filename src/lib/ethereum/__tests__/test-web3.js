//@flow
import "jest";

import Web3Session from "../Web3Session";

require("dotenv").config();

test("account creation be unique, even with same entropy", () => {
  const session = Web3Session.createMainnetSession();
  const entropy = session.randomHex(32);
  const account1 = session.createAccount(entropy);
  const account2 = session.createAccount(entropy);
  expect(account1.address).not.toBe(account2.address);
});

test("privateKeyToAccount() recovers account from private key", () => {
  const session = Web3Session.createMainnetSession();
  const account = session.createAccount(session.randomHex(32));
  session.clearWallet();
  const recoveredAccount = session.privateKeyToAccount(account.privateKey);
  expect(recoveredAccount).not.toBeNull();
  if (recoveredAccount != null) {
    expect(account.address).toBe(recoveredAccount.address);
    expect(account.privateKey).toBe(recoveredAccount.privateKey);
  }
});

test("privateKeyToAccount() non invalid account is null", () => {
  const session = Web3Session.createMainnetSession();
  const recoveredAccount = session.privateKeyToAccount("invalid account");
  expect(recoveredAccount).toBeNull();
});

test("test isAddress() on a generated account", () => {
  const session = Web3Session.createMainnetSession();
  const account = session.createAccount(session.randomHex(32));
  expect(session.isAddress(account.address)).toBeTruthy();
});

test("test gas price estimated", async () => {
  const session = Web3Session.createMainnetSession();
  const priceWei = await session.getGasPriceWei();
  expect(priceWei.toNumber()).toBeGreaterThan(0);
});

test("test getEthBalance() on an invalid address", async () => {
  const session = Web3Session.createMainnetSession();
  const balance = await session.getEthBalance("<an invalid address>");
  expect(balance).toBeNull();
});

test("test getEthBalance() on a valid address", async () => {
  const session = Web3Session.createMainnetSession();
  const account = session.createAccount(session.randomHex(32));
  const balance = await session.getEthBalance(account.address);
  expect(balance).not.toBeNull();
});

test("test getBlockNumber()", async () => {
  const session = Web3Session.createMainnetSession();
  const blockNumber = await session.getBlockNumber();
  expect(blockNumber).toBeGreaterThan(0);
});

test("test getLatestBlock() with only transaction hashes", async () => {
  const session = Web3Session.createMainnetSession();
  // $FlowFixMe
  const block = await session.getLatestBlock(false);
  expect(block.transactions).not.toHaveLength(0);
  expect(block.transactions[0]).toMatch(block.transactions[0]);
});

test("test getLatestBlock() with transaction objects", async () => {
  const session = Web3Session.createMainnetSession();
  // $FlowFixMe
  const block = await session.getLatestBlock();
  expect(block.transactions).not.toHaveLength(0);
  const transaction = block.transactions[0];
  expect(block.transactions[0]).toMatchObject({ hash: transaction.hash });
});

test("test getTransaction() on session", async () => {
  const session = Web3Session.createMainnetSession();

  const hash =
    "0x1fc5384c72c90290b96177003af53c1720d9dda9a697ddb944dc435c95ea576c";
  // $FlowFixMe
  const transaction = await session.getTransaction(hash);
  expect(transaction).not.toBeNull();
  expect(transaction.hash).toBe(hash);
});

test("test getTransaction() on non-existent transaction", async () => {
  const session = Web3Session.createMainnetSession();
  const transaction = await session.getTransaction("<not a tx hash>");
  expect(transaction).toBeNull();
});

test("test getBlockConfirmations() on non-existent transaction", async () => {
  const session = Web3Session.createMainnetSession();
  const confirmations = await session.getBlockConfirmations("<not a tx hash>");
  expect(confirmations).toBeNull();
});

test("test getBlockConfirmations() on existing transaction", async () => {
  const session = Web3Session.createMainnetSession();
  const hash =
    "0x1fc5384c72c90290b96177003af53c1720d9dda9a697ddb944dc435c95ea576c";
  const confirmations = await session.getBlockConfirmations(hash);
  // this mainnet transaction should have at least 5000 confirmations by now
  expect(confirmations).toBeGreaterThan(5000);
});

test("test Web3Session.isMainnet() on mainnet", async () => {
  const session = Web3Session.createMainnetSession();
  const isMainnet = await session.isMainnet();
  expect(isMainnet).toBeTruthy();
});

test("test Web3Session.isMainnet() on ropsten", async () => {
  const session = Web3Session.createRopstenSession();
  const isMainnet = await session.isMainnet();
  expect(isMainnet).toBeFalsy();
});

test("test Web3Session.isMainnet() on rinkeby", async () => {
  const session = Web3Session.createRinkebySession();
  const isMainnet = await session.isMainnet();
  expect(isMainnet).toBeFalsy();
});
