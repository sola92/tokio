//@flow
import { BigNumber } from "bignumber.js";
import BaseModel from "src/lib/BaseModel";
import { InvalidStateError } from "src/hancock/errors";
import type { BaseFields } from "src/lib/BaseModel";
import type { Knex$Transaction } from "knex";

export type BalanceAction = "withdraw" | "trade" | "deposit";
export type BalanceLogState = "pending" | "confirmed" | "cancelled";
export type Fields = BaseFields & {
  userId: number,
  accountId: number,
  assetId: number,
  amount: string,
  action: string,
  note: string,
  identifier?: string,
  state: BalanceLogState
};

export default class BalanceLog extends BaseModel<Fields> {
  static tableName = "balance_logs";

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

  static jsonSchema = {
    type: "object",

    properties: {
      accountId: {
        type: "number"
      },
      assetId: {
        type: "number"
      },
      amount: { type: "string" },
      action: { type: "string" },
      note: { type: "string" },
      state: { type: "string" },
      identifier: { type: ["string", null] }
    }
  };
}
