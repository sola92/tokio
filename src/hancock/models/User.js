//@flow
import BaseModel from "src/lib/BaseModel";
import { Model } from "objection";
import type { BaseFields } from "src/lib/BaseModel";

import Account from "./Account";

export type Fields = BaseFields & {};

export default class User extends BaseModel<Fields> {
  static tableName = "users";

  static get relationMappings() {
    return {
      movies: {
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
