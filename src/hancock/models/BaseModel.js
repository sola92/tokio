//@flow
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable no-redeclare */

import { Model } from "objection";
import moment from "moment";
import type { Knex } from "knex";

type Comparison = "<" | ">" | "=" | "like";

type UpdateQuery<M, F> = {
  where(column: string, operator: Comparison, value: any): Promise<M>
};

type QueryBuilder<M, F> = {
  skipUndefined(): QueryBuilder<M, F>,
  insert(values: $Shape<F>): Promise<M>,
  select(...args: Array<string>): QueryBuilder<M, F>,
  patch(values: $Shape<F>): UpdateQuery<M, F>,
  update(values: $Shape<F>): UpdateQuery<M, F>,
  where(column: string, operator: Comparison, value: any): QueryBuilder<M, F>,
  orderBy(columns: string): Promise<M>,
  deleteById(id: string | number): Promise<>,
  findById(id: string | number): Promise<M>
};

export type BaseFields = {
  id: number,
  createdAt: moment,
  updatedAt: moment
};

const globals = {};

export default class BaseModel<F: BaseFields> extends Model {
  attr: F;

  constructor(...args: Array<any>) {
    super(...args);

    // $FlowFixMe
    Object.defineProperty(this, "attr", {
      get() {
        return new Proxy(this, {});
      },
      set(value) {
        new Proxy(this, {});
      }
    });
  }

  async refresh<M: BaseModel<F>>(): Promise<M> {
    return await this.constructor.query().findById(this.attr.id);
  }

  static query<M: BaseModel<F>>(trx?: Knex$Transaction<*>): QueryBuilder<M, F> {
    // $FlowFixMe
    return super.query(trx);
  }

  static fromJson<M: BaseModel<F>>(fields: $Shape<F>) {
    // $FlowFixMe
    return super.fromJson(fields);
  }

  $parseDatabaseJson(json: ?Json) {
    // $FlowFixMe
    json = super.$parseDatabaseJson(json);

    if (json != null) {
      if (json.updatedAt != null) {
        this.attr.updatedAt = moment(json.updatedAt);
      }

      if (json.createdAt != null) {
        this.attr.createdAt = moment(json.createdAt);
      }
    }

    return json;
  }
}
