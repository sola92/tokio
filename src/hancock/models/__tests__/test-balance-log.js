//@flow
import "jest";
import "src/hancock/init-db";
import BalanceLog from "../BalanceLog";
import UserBalance from "../UserBalance";
import AccountBalance from "../AccountBalance";

import { InvalidStateError } from "src/hancock/errors";

import { BigNumber } from "bignumber.js";
import { randomId, randomStringId } from "src/test/util";

test("test pending deposit", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  await BalanceLog.insert({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID,
    amount: "10",
    action: "deposit",
    note: "deposit not",
    state: "pending"
  });

  const userBalance: ?UserBalance = await UserBalance.fetch({
    userId: USER_ID,
    assetId: ASSET_ID
  });

  const accountBalance: ?AccountBalance = await AccountBalance.fetch({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID
  });

  expect(userBalance).not.toBeNull();
  expect(accountBalance).not.toBeNull();
  if (accountBalance == null || userBalance == null) {
    return;
  }
  expect(accountBalance.pendingBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(0).toString()
  );
  expect(userBalance.pendingBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(0).toString()
  );
});

test("test pending deposit becoming confirmed", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  const deposit: BalanceLog = await BalanceLog.insert({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID,
    amount: "10",
    action: "deposit",
    note: "note",
    state: "pending"
  });

  const userBalance: ?UserBalance = await UserBalance.fetch({
    userId: USER_ID,
    assetId: ASSET_ID
  });

  const accountBalance: ?AccountBalance = await AccountBalance.fetch({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID
  });

  expect(userBalance).not.toBeNull();
  expect(accountBalance).not.toBeNull();
  if (accountBalance == null || userBalance == null) {
    return;
  }
  expect(accountBalance.pendingBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(0).toString()
  );

  expect(userBalance.pendingBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(0).toString()
  );

  await deposit.confirm();

  await accountBalance.refresh();
  await userBalance.refresh();
  expect(accountBalance.pendingBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(userBalance.pendingBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
});

test("test withdrawal", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  const deposit: BalanceLog = await BalanceLog.insert({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID,
    amount: "10",
    action: "deposit",
    note: "note",
    state: "confirmed"
  });

  const userBalance: ?UserBalance = await UserBalance.fetch({
    userId: USER_ID,
    assetId: ASSET_ID
  });

  const accountBalance: ?AccountBalance = await AccountBalance.fetch({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID
  });

  expect(userBalance).not.toBeNull();
  expect(accountBalance).not.toBeNull();
  if (accountBalance == null || userBalance == null) {
    return;
  }
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );

  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  await deposit.confirm();

  const withdrawal: BalanceLog = await BalanceLog.insert({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID,
    amount: "-5",
    action: "withdrawal",
    note: "note",
    state: "pending"
  });

  await accountBalance.refresh();
  await userBalance.refresh();

  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(5).toString()
  );

  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(5).toString()
  );
  await withdrawal.confirm();

  await accountBalance.refresh();
  await userBalance.refresh();
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(5).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(5).toString()
  );
});

test("test cancelled withdrawal", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  const deposit: BalanceLog = await BalanceLog.insert({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID,
    amount: "10",
    action: "deposit",
    note: "note",
    state: "confirmed"
  });

  const userBalance: ?UserBalance = await UserBalance.fetch({
    userId: USER_ID,
    assetId: ASSET_ID
  });

  const accountBalance: ?AccountBalance = await AccountBalance.fetch({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID
  });

  expect(userBalance).not.toBeNull();
  expect(accountBalance).not.toBeNull();
  if (accountBalance == null || userBalance == null) {
    return;
  }
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );

  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  await deposit.confirm();

  const withdrawal: BalanceLog = await BalanceLog.insert({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID,
    amount: "-5",
    action: "withdrawal",
    note: "note",
    state: "pending"
  });

  await accountBalance.refresh();
  await userBalance.refresh();

  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(5).toString()
  );

  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(5).toString()
  );

  await withdrawal.cancel();

  await accountBalance.refresh();
  await userBalance.refresh();
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
});

test("test cancelled deposit", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  const deposit: BalanceLog = await BalanceLog.insert({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID,
    amount: "10",
    action: "deposit",
    note: "note",
    state: "pending"
  });

  const userBalance: ?UserBalance = await UserBalance.fetch({
    userId: USER_ID,
    assetId: ASSET_ID
  });

  const accountBalance: ?AccountBalance = await AccountBalance.fetch({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID
  });

  expect(userBalance).not.toBeNull();
  expect(accountBalance).not.toBeNull();
  if (accountBalance == null || userBalance == null) {
    return;
  }
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(0).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(0).toString()
  );
  await deposit.cancel();

  await accountBalance.refresh();
  await userBalance.refresh();

  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(0).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(0).toString()
  );
});

test("test cancelling a confirmed withdrawal fails", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  const deposit: BalanceLog = await BalanceLog.insert({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID,
    amount: "10",
    action: "deposit",
    note: "note",
    state: "confirmed"
  });

  const userBalance: ?UserBalance = await UserBalance.fetch({
    userId: USER_ID,
    assetId: ASSET_ID
  });

  const accountBalance: ?AccountBalance = await AccountBalance.fetch({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID
  });

  expect(userBalance).not.toBeNull();
  expect(accountBalance).not.toBeNull();
  if (accountBalance == null || userBalance == null) {
    return;
  }
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );

  const withdrawal: BalanceLog = await BalanceLog.insert({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID,
    amount: "-5",
    action: "withdrawal",
    note: "note",
    state: "confirmed"
  });

  await accountBalance.refresh();
  await userBalance.refresh();
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(5).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(5).toString()
  );

  expect(withdrawal.cancel()).rejects.toBeInstanceOf(InvalidStateError);

  await accountBalance.refresh();
  await userBalance.refresh();
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(5).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(5).toString()
  );
});

test("test cancelling a confirmed deposit fails", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  const deposit: BalanceLog = await BalanceLog.insert({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID,
    amount: "10",
    action: "deposit",
    note: "note",
    state: "confirmed"
  });

  const userBalance: ?UserBalance = await UserBalance.fetch({
    userId: USER_ID,
    assetId: ASSET_ID
  });

  const accountBalance: ?AccountBalance = await AccountBalance.fetch({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID
  });

  expect(userBalance).not.toBeNull();
  expect(accountBalance).not.toBeNull();
  if (accountBalance == null || userBalance == null) {
    return;
  }
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(deposit.cancel()).rejects.toBeInstanceOf(InvalidStateError);

  await accountBalance.refresh();
  await userBalance.refresh();
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
});

test("test cannot change log amount", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  const deposit: BalanceLog = await BalanceLog.insert({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID,
    amount: "10",
    action: "deposit",
    note: "note",
    state: "confirmed"
  });

  const userBalance: ?UserBalance = await UserBalance.fetch({
    userId: USER_ID,
    assetId: ASSET_ID
  });

  const accountBalance: ?AccountBalance = await AccountBalance.fetch({
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    assetId: ASSET_ID
  });

  expect(userBalance).not.toBeNull();
  expect(accountBalance).not.toBeNull();
  if (accountBalance == null || userBalance == null) {
    return;
  }
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(deposit.update({ amount: "100" })).rejects.toBeInstanceOf(Error);

  await accountBalance.refresh();
  await userBalance.refresh();
  expect(accountBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
  expect(userBalance.availableBalanceBN.toString()).toBe(
    new BigNumber(10).toString()
  );
});
