//@flow
import { BigNumber } from "bignumber.js";
import BaseModel from "src/lib/BaseModel";
import type { BaseFields } from "src/lib/BaseModel";

export type Fields = BaseFields & {
  userId: number,
  assetId: number,
  accountId: number,
  totalPending: number,
  availableBalance: number
};

export default class AccountBalance extends BaseModel<Fields> {
  static tableName = "account_balances";

  get totalPendingBN(): BigNumber {
    return new BigNumber(this.attr.totalPending);
  }

  get availableBalanceBN(): BigNumber {
    return new BigNumber(this.attr.availableBalance);
  }

  static fetch({
    userId,
    assetId,
    accountId
  }: {
    userId: number,
    assetId: number,
    accountId: number
  }): Promise<?this> {
    return this.findOne({ userId, accountId, assetId });
  }

  async adjustPendingBalance(amount: BigNumber, trx: Knex$Transaction) {
    const newPendingBalance = BigNumber(this.attr.totalPending).plus(amount);
    await this.update({ totalPending: newPendingBalance.toNumber() }, trx);

    const numUpdated = 1;
    if (numUpdated != 1) {
      throw new AccountBusyError(
        "failed to increment pending balance amount=" +
          amount +
          " for AccountBalance userId=" +
          this.attr.userId +
          " assetId=" +
          this.attr.assetId +
          " accountId=" +
          this.attr.accountId
      );
    }
    console.log("ZZZ adjusted pending balance: " + newPendingBalance);
    return this;
  }

  async confirmPendingBalance(amount: BigNumber, trx: Knex$Transaction) {
    // TODO(sujen) currently enforcing that this amount must be the same as pending.
    // Eventually, allow many pending balances.
    if (!amount.isEqualTo(this.attr.totalPending)) {
      throw Error(
        "confirmPendingBalance: amount=" +
          amount.toFixed() +
          " != totalPending=" +
          this.attr.totalPending
      );
    }

    const newBalance = BigNumber(this.attr.availableBalance).plus(amount);
    await this.update(
      { totalPending: 0, availableBalance: newBalance.toNumber() },
      trx
    );
    return this;
  }
}
