//@flow
import { BigNumber } from "bignumber.js";
import BaseModel from "src/lib/BaseModel";
import { InvalidStateError } from "src/hancock/errors";
import type { BaseFields } from "src/lib/BaseModel";
import type { Knex$Transaction } from "knex";

export type BalanceAction = "withdraw" | "trade" | "deposit";
export type BalanceEventState = "pending" | "confirmed" | "cancelled";
export type Fields = BaseFields & {
  userId: number,
  accountId: number,
  assetId: number,
  amount: string,
  action: string,
  note: string,
  identifier?: string,
  state: BalanceEventState
};

export default class BalanceEvent extends BaseModel<Fields> {
  static tableName = "balance_events";

  get amountBN(): BigNumber {
    return new BigNumber(this.attr.amount);
  }

  confirm(trx?: Knex$Transaction) {
    return this.update({ state: "confirmed" }, trx);
  }

  async cancel(trx?: Knex$Transaction) {
    if (this.attr.state == "confirmed") {
      throw new InvalidStateError("cannot cancel a confirmed transaction");
    }

    return this.update({ state: "cancelled" }, trx);
  }
}
