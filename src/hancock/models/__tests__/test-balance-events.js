//@flow
import "jest";
import "src/hancock/init-db";
import BalanceEvent from "../BalanceEvent";
import UserBalance from "../UserBalance";
import AccountBalance from "../AccountBalance";

import { InvalidStateError } from "src/hancock/errors";

import { randomId } from "src/test/util";

test("test pending deposit", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  await BalanceEvent.insert({
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
  expect(accountBalance.totalPendingBN.toNumber()).toBe(10);
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(0);
  expect(userBalance.totalPendingBN.toNumber()).toBe(10);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(0);
});

test("test pending deposit becoming confirmed", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  const deposit: BalanceEvent = await BalanceEvent.insert({
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
  expect(accountBalance.totalPendingBN.toNumber()).toBe(10);
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(0);
  expect(userBalance.totalPendingBN.toNumber()).toBe(10);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(0);

  await deposit.confirm();

  await accountBalance.refresh();
  await userBalance.refresh();
  expect(accountBalance.totalPendingBN.toNumber()).toBe(0);
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(10);
  expect(userBalance.totalPendingBN.toNumber()).toBe(0);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(10);
});

test("test withdrawal", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  const deposit: BalanceEvent = await BalanceEvent.insert({
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
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(10);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(10);
  await deposit.confirm();

  const withdrawal: BalanceEvent = await BalanceEvent.insert({
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

  expect(accountBalance.availableBalanceBN.toNumber()).toBe(5);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(5);
  await withdrawal.confirm();

  await accountBalance.refresh();
  await userBalance.refresh();
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(5);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(5);
});

test("test cancelled withdrawal", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  const deposit: BalanceEvent = await BalanceEvent.insert({
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
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(10);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(10);
  await deposit.confirm();

  const withdrawal: BalanceEvent = await BalanceEvent.insert({
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

  expect(accountBalance.availableBalanceBN.toNumber()).toBe(5);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(5);
  expect(userBalance.totalPendingBN.toNumber()).toBe(-5);
  expect(accountBalance.totalPendingBN.toNumber()).toBe(-5);

  await withdrawal.cancel();
  await userBalance.refresh();
  await accountBalance.refresh();

  expect(accountBalance.availableBalanceBN.toNumber()).toBe(10);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(10);
  expect(userBalance.totalPendingBN.toNumber()).toBe(0);
  expect(accountBalance.totalPendingBN.toNumber()).toBe(0);
});

test("test cancelled deposit", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  const deposit: BalanceEvent = await BalanceEvent.insert({
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
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(0);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(0);
  await deposit.cancel();

  await accountBalance.refresh();
  await userBalance.refresh();

  expect(accountBalance.availableBalanceBN.toNumber()).toBe(0);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(0);
});

test("test cancelling a confirmed withdrawal fails", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  await BalanceEvent.insert({
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
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(10);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(10);

  const withdrawal: BalanceEvent = await BalanceEvent.insert({
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
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(5);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(5);

  expect(withdrawal.cancel()).rejects.toBeInstanceOf(InvalidStateError);

  await accountBalance.refresh();
  await userBalance.refresh();
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(5);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(5);
});

test("test cancelling a confirmed deposit fails", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  const deposit: BalanceEvent = await BalanceEvent.insert({
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
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(10);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(10);
  expect(userBalance.totalPendingBN.toNumber()).toBe(0);
  expect(accountBalance.totalPendingBN.toNumber()).toBe(0);
  expect(deposit.cancel()).rejects.toBeInstanceOf(InvalidStateError);

  await accountBalance.refresh();
  await userBalance.refresh();
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(10);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(10);
  expect(userBalance.totalPendingBN.toNumber()).toBe(0);
  expect(accountBalance.totalPendingBN.toNumber()).toBe(0);
});

test("test cannot change log amount", async () => {
  const USER_ID = randomId();
  const ASSET_ID = randomId();
  const ACCOUNT_ID = randomId();

  const deposit: BalanceEvent = await BalanceEvent.insert({
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
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(10);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(10);
  expect(deposit.update({ amount: "100" })).rejects.toBeInstanceOf(Error);

  await accountBalance.refresh();
  await userBalance.refresh();
  expect(accountBalance.availableBalanceBN.toNumber()).toBe(10);
  expect(userBalance.availableBalanceBN.toNumber()).toBe(10);
});
