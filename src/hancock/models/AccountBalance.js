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
}
