//@flow
import Knex from "knex";

exports.up = async (knex: Knex<*>, Promise: Promise<*>) => {
  return knex.schema.createTable("assets", table => {
    table.increments("id").primary();
    table.string("name", 50).notNullable();
    table.string("type", 24).notNullable();
    table
      .string("ticker", 15)
      .notNullable()
      .unique();
    table.integer("decimals").nullable();
    table.text("abi", "longtext").nullable();
    table.string("contractAddress", 42).nullable();
    table.timestamp("createdAt", 3).defaultTo(knex.fn.now(3));
    table.timestamp("updatedAt", 3).defaultTo(knex.fn.now(3));

    table.comment(`assets we offer`);
  });
};

exports.down = async (knex: Knex<*>, Promise: Promise<*>) => {
  return knex.schema.dropTableIfExists("assets");
};
