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
      .nullable()
      .index()
      .unique();
    table.text("data", "longtext").nullable();
    table.string("value").notNullable();
    table.string("gasLimit").nullable();
    table.string("gasPriceWei").nullable();
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
      .integer("assetId")
      .index()
      .notNullable();

    table.comment(`
      has an entry for every ethereum transaction. if the blockNumber is null,
      transaction has not been confirmed yet
    `);
  });
};

exports.down = async (knex: Knex<*>, Promise: Promise<*>) => {
  return knex.schema.dropTableIfExists("eth_transaction");
};
