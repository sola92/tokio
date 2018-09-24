//@flow
import BaseModel from "src/lib/BaseModel";
import type { BaseFields } from "src/lib/BaseModel";

import { AccountBusyError } from "../errors";

export type Fields = BaseFields & {
  assetId: number,
  address: string,
  lastNonce: number,

  // temporary storage of PK for easy retrieval
  privateKey: string
};

export default class Account extends BaseModel<Fields> {
  static tableName = "accounts";

  async fetchAndIncrementNonce() {
    const { lastNonce } = this.attr;

    const numUpdated: number = await Account.query()
      .patch({ lastNonce: lastNonce + 1 })
      .where("id", this.attr.id)
      .where("lastNonce", lastNonce);

    if (numUpdated != 1) {
      throw new AccountBusyError("failed to increment nonce");
    }

    return lastNonce + 1;
  }

  static findByAddress(address: string, assetId: number): Promise<?this> {
    return this.query().findOne({ address, assetId });
  }
}
