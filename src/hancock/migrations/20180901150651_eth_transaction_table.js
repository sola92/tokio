//@flow
import Knex from "knex";

exports.up = async (knex: Knex<*>, Promise: Promise<*>) => {
  return knex.schema.createTable("eth_transaction", table => {
    table.increments("id").primary();
    table
      .string("from", 42)
      .index()
      .notNullable();
    table.string("to", 42).notNullable();
    table
      .string("hash", 100)
      .notNullable()
      .index()
      .unique();
    table.text("data", "longtext").notNullable();
    table.string("value").notNullable();
    table.string("gasLimit").notNullable();
    table.string("gasPrice").notNullable();
    table
      .integer("numRetries")
      .notNullable()
      .defaultTo(0)
      .comment(`number of times this transaction has been attemped`);
    table.integer("blockNumber").nullable();
    table
      .string("contractAddress")
      .nullable()
      .comment(`this is null until transaction is confirmed`);
    table.integer("chainId").notNullable();

    table
      .timestamp("createdAt", 3)
      .defaultTo(knex.fn.now(3))
      .index();
    table
      .timestamp("updatedAt", 3)
      .defaultTo(knex.fn.now(3))
      .index();

    table.integer("nonce").notNullable();
    table
      .string("state")
      .notNullable()
      .defaultTo("pending")
      .index();
    table
      .string("ticker", 20)
      .index()
      .nullable();

    table.comment(`
      has an entry for every ethereum transaction. if the blockNumber is null,
      transaction has not been confirmed yet
    `);
  });
};

exports.down = async (knex: Knex<*>, Promise: Promise<*>) => {
  return knex.schema.dropTableIfExists("eth_transaction");
};
