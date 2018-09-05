//@flow
import Knex from "knex";

exports.up = async (knex: Knex<*>, Promise: Promise<*>) => {
  return knex.schema.createTable("eth_accounts", table => {
    table.increments("id").primary();
    table
      .string("address", 42)
      .notNullable()
      .index()
      .unique();
    table.timestamp("createdAt", 3).defaultTo(knex.fn.now(3));
    table.timestamp("updatedAt", 3).defaultTo(knex.fn.now(3));

    table
      .string("gasBalanceWei")
      .defaultTo("0")
      .notNullable()
      .comment(
        `amount of gas (in wei) we have in this account for processing transfers`
      );

    table
      .string("privateKey", 100)
      .comment(`this is temporary. will be migrated elsewhere`);

    table
      .integer("lastNonce")
      .notNullable()
      .defaultTo(0).comment(`
        last nonce used to issue a transaction from this address. this is
        usually number of transactions that have been sent from this address
      `);

    table.bigInteger("lockExpireTimeMs").nullable().comment(`
          if set, account is locked and value is the timestamp (in ms) that the
          lock expires
        `);

    // temporary storage of PK for easy retrieval
    table.comment(`
      has an entry for every ethereum address we own. if the blockNumber is null,
      transaction has not been confirmed yet
    `);
  });
};

exports.down = async (knex: Knex<*>, Promise: Promise<*>) => {
  return knex.schema.dropTableIfExists("eth_addresses");
};
