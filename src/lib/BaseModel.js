//@flow
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable no-redeclare */

import { Model } from "objection";
import moment from "moment";
import type { Knex } from "knex";

type Comparison = "<" | ">" | "=" | "like";

type UpdateQuery<R, F> = {
  where(
    column: string,
    operator: Comparison,
    value: any
  ): Promise<R> & UpdateQuery<R, F>
};

type Id = number;

type QueryBuilder<M, F> = {
  skipUndefined(): QueryBuilder<M, F>,
  insert(values: $Shape<F>): Promise<M>,
  select(...args: Array<string>): QueryBuilder<M, F>,
  count(): UpdateQuery<number, F>,
  patch(values: $Shape<F>): UpdateQuery<number, F>,
  update(values: $Shape<F>): UpdateQuery<number, F>,
  where(column: $Keys<F>, operator: Comparison, value: any): QueryBuilder<M, F>,
  orderBy(columns: $Keys<F>): Promise<M>,
  deleteById(id: Id): Promise<>,
  findById(id: Id): Promise<?M>,
  findOne(conditions: $Shape<F>): Promise<?M>,
  patchAndFetchById(id: Id, updates: $Shape<F>): Promise<M>,
  updateAndFetchById(id: Id, updates: $Shape<F>): Promise<M>
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

  async update<M: BaseModel<F>>(updates: $Shape<F>): Promise<M> {
    return await this.constructor
      .query()
      .updateAndFetchById(this.attr.id, updates);
  }

  async refresh<M: BaseModel<F>>(): Promise<M> {
    // $FlowFixMe
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

  static findById<M: BaseModel<F>>(id: Id): Promise<?M> {
    return this.query().findById(id);
  }

  static findOne<M: BaseModel<F>>(conditions: $Shape<F>): Promise<?M> {
    return this.query().findOne(conditions);
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
