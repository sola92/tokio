//@flow
import BaseModel from "src/lib/BaseModel";
import { Model } from "objection";
import { BigNumber } from "bignumber.js";
import type { BaseFields } from "src/lib/BaseModel";

import Account from "./Account";
import UserBalance from "./UserBalance";

export type Fields = BaseFields & {};

export default class User extends BaseModel<Fields> {
  static tableName = "users";
  accounts: Array<Account>;

  async addAccount(account: Account) {
    await this.constructor
      .knex()
      .insert({ userId: this.attr.id, accountId: account.attr.id })
      .into("user_accounts");
    await this.$loadRelated("accounts");
  }

  async getAvailableBalance(assetId: number): Promise<BigNumber> {
    const userBalance = await UserBalance.fetch({
      assetId,
      userId: this.attr.id
    });
    return userBalance ? userBalance.availableBalanceBN : new BigNumber(0);
  }

  static get relationMappings() {
    return {
      accounts: {
        relation: Model.ManyToManyRelation,
        modelClass: Account,
        join: {
          from: "users.id",
          through: {
            from: "user_accounts.userId",
            to: "user_accounts.accountId"
          },
          to: `${Account.tableName}.id`
        }
      }
    };
  }
}
