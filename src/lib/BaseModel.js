//@flow
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable no-redeclare */

import { Model, transaction } from "objection";
import moment from "moment";
import type { Knex, $QueryBuilder, Knex$Transaction } from "knex";

type Id = number;

type QueryBuilder<R, F> = $QueryBuilder<R> & {
  deleteById(id: Id): Promise<>,
  findById(id: Id): Promise<?R>,
  where(key: $Keys<F>, eq: any): $QueryBuilder<R>,
  patch(updates: $Shape<F>): $QueryBuilder<R>,
  findOne(conditions: $Shape<F>): Promise<?R>,
  patchAndFetchById(id: Id, updates: $Shape<F>): Promise<R>,
  updateAndFetchById(id: Id, updates: $Shape<F>): Promise<R>
};

export type BaseFields = {
  id: number,
  createdAt: moment,
  updatedAt: moment
};

const globals = {};

export default class BaseModel<F: BaseFields> extends Model {
  attr: F;
  id: number;
  createdAt: moment;
  updatedAt: moment;

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

  async transaction(fn: (trx: Knex$Transaction) => Promise<void>) {
    let trx: ?Knex$Transaction;
    try {
      trx = await transaction.start(this.constructor.knex());
      await fn(trx);
      await trx.commit();
    } catch (err) {
      if (trx) {
        await trx.rollback();
      }
      throw err;
    }
  }

  async update(updates: $Shape<F>, trx?: Knex$Transaction) {
    const Model =
      trx != null ? this.constructor.bindTransaction(trx) : this.constructor;

    const newer = await Model.query().updateAndFetchById(this.attr.id, updates);

    Object.assign(this, newer);
  }

  async refresh(trx?: Knex$Transaction) {
    const newer = await this.constructor.query(trx).findById(this.attr.id);
    Object.assign(this, newer);
  }

  static query<R>(trx?: Knex$Transaction): QueryBuilder<R, F> {
    // $FlowFixMe
    return super.query(trx);
  }

  static insert(fields: $Shape<F>, trx?: Knex$Transaction): Promise<this> {
    // $FlowFixMe
    return super.query(trx).insert(fields);
  }

  static fromJson<M: BaseModel<F>>(fields: $Shape<F>) {
    // $FlowFixMe
    return super.fromJson(fields);
  }

  static findById(id: Id): Promise<?this> {
    return this.query().findById(id);
  }

  static byId(id: Id): Promise<?this> {
    return this.query().findById(id);
  }

  static findOne(conditions: $Shape<F>): Promise<?this> {
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
