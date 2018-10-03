//@flow
import { BigNumber } from "bignumber.js";
import BaseModel from "src/lib/BaseModel";
import type { BaseFields } from "src/lib/BaseModel";

export type Fields = BaseFields & {
  userId: number,
  assetId: number,
  totalPending: number,
  availableBalance: number
};

export default class UserBalance extends BaseModel<Fields> {
  static tableName = "user_balances";

  get totalPendingBN(): BigNumber {
    return new BigNumber(this.attr.totalPending);
  }

  get availableBalanceBN(): BigNumber {
    return new BigNumber(this.attr.availableBalance);
  }

  static fetch({
    userId,
    assetId
  }: {
    userId: number,
    assetId: number
  }): Promise<?this> {
    return this.findOne({ userId, assetId });
  }
}
