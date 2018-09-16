//@flow
import Knex from "knex";

exports.up = async (knex: Knex<*>, Promise: Promise<*>) => {
  await knex.schema.createTable("eth_accounts", table => {
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

  await knex.schema.createTable("account_balances", table => {
    table.increments("id").primary();
    table.timestamp("createdAt", 3).defaultTo(knex.fn.now(3));
    table.timestamp("updatedAt", 3).defaultTo(knex.fn.now(3));

    table
      .decimal("pendingBalance", 65, 30)
      .notNullable()
      .defaultTo(0);

    table
      .decimal("availableBalance", 65, 30)
      .notNullable()
      .defaultTo(0);

    table
      .integer("accountId")
      .notNullable()
      .index();

    table
      .integer("assetId")
      .notNullable()
      .index();

    table
      .integer("userId")
      .notNullable()
      .index();

    table
      .string("identifier")
      .nullable()
      .index();

    table.index(["assetId", "accountId", "userId"]);
    table.unique(["assetId", "accountId", "userId"]);
  });

  await knex.schema.createTable("user_balances", table => {
    table.increments("id").primary();
    table.timestamp("createdAt", 3).defaultTo(knex.fn.now(3));
    table.timestamp("updatedAt", 3).defaultTo(knex.fn.now(3));

    table
      .decimal("pendingBalance", 65, 30)
      .notNullable()
      .defaultTo(0);

    table
      .decimal("availableBalance", 65, 30)
      .notNullable()
      .defaultTo(0);

    table
      .integer("assetId")
      .notNullable()
      .index();

    table
      .integer("userId")
      .notNullable()
      .index();

    table.index(["assetId", "userId"]);
    table.unique(["assetId", "userId"]);
  });

  await knex.schema.createTable("balance_logs", table => {
    table.increments("id").primary();
    table.timestamp("createdAt", 3).defaultTo(knex.fn.now(3));
    table.timestamp("updatedAt", 3).defaultTo(knex.fn.now(3));

    table.decimal("amount", 65, 30).notNullable();
    table
      .integer("accountId")
      .notNullable()
      .index();

    table
      .integer("assetId")
      .notNullable()
      .index();

    table
      .integer("userId")
      .notNullable()
      .index();

    table
      .string("action")
      .notNullable()
      .comment(`type of transaction`)
      .notNullable();

    table
      .string("note")
      .notNullable()
      .comment(`describe what this transaction is in detail`)
      .notNullable();

    table
      .string("identifier")
      .nullable()
      .index().comment(`
        external id that uniquely identifies this event... usually a tx hash
      `);

    table.string("state").notNullable();

    table.index(["assetId", "accountId", "userId"]);
    table.unique(["assetId", "identifier"]);
  });

  await knex.schema.createTable("users", table => {
    table.increments("id").primary();
    table.timestamp("createdAt", 3).defaultTo(knex.fn.now(3));
    table.timestamp("updatedAt", 3).defaultTo(knex.fn.now(3));
  });

  await knex.schema.createTable("accounts", table => {
    table.increments("id").primary();
    table.timestamp("createdAt", 3).defaultTo(knex.fn.now(3));
    table.timestamp("updatedAt", 3).defaultTo(knex.fn.now(3));

    table.integer("assetId").notNullable();
    table.integer("address").notNullable();
    table.integer("lastNonce").notNullable();

    table
      .string("privateKey")
      .nullable()
      .comment(`this is temporary. easy retrieval`);
  });

  await knex.schema.createTable("user_accounts", table => {
    table.increments("id").primary();
    table.timestamp("createdAt", 3).defaultTo(knex.fn.now(3));
    table.timestamp("updatedAt", 3).defaultTo(knex.fn.now(3));

    table
      .integer("accountId")
      .notNullable()
      .index();

    table
      .integer("userId")
      .notNullable()
      .index();

    table.index(["userId", "accountId"]);
    table.unique(["userId", "accountId"]);
  });

  await knex.raw(`DROP PROCEDURE IF EXISTS update_account_balance;`);
  await knex.raw(`
  CREATE PROCEDURE update_account_balance (IN account_id INT, IN user_id INT, IN asset_id INT)
    BEGIN
      DECLARE available_balance DECIMAL(65, 30);
      DECLARE pending_balance DECIMAL(65, 30);
      SELECT SUM(amount) INTO available_balance FROM balance_logs
      WHERE (
        userId = user_id and
        assetId = asset_id and
        accountId = account_id and
        (
          state = "confirmed" or
          /* debits are immediately removed from available balance */
          (amount < 0 and state != "cancelled")
        )
      );

      SELECT SUM(amount) INTO pending_balance FROM balance_logs
      WHERE (
        userId = user_id and
        assetId = asset_id and
        accountId = account_id and
        state != "cancelled"
      );

      IF available_balance IS NULL THEN
        SET available_balance := 0;
      END IF;

      IF pending_balance IS NULL THEN
        SET pending_balance := 0;
      END IF;

      IF pending_balance < 0
      THEN
         SIGNAL SQLSTATE '45000'
           SET MESSAGE_TEXT = 'Error: Pending balance cannot be less than zero!';
      END IF;

      IF available_balance < 0
      THEN
         SIGNAL SQLSTATE '45000'
           SET MESSAGE_TEXT = 'Error: available balance cannot be less than zero!';
      END IF;

      IF pending_balance < available_balance
      THEN
         SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Pending balance should always be less available balance';
      END IF;

      INSERT INTO account_balances (userId, accountId, assetId, pendingBalance, availableBalance)
      VALUES (user_id, account_id, asset_id, pending_balance, available_balance)
      ON DUPLICATE KEY UPDATE pendingBalance=pending_balance, availableBalance=available_balance;
  END
  `);

  await knex.raw(`DROP PROCEDURE IF EXISTS update_user_balance;`);
  await knex.raw(`
    CREATE PROCEDURE update_user_balance (IN user_id INT, IN asset_id INT)
    BEGIN
      DECLARE total_available DECIMAL(65, 30);
      DECLARE total_pending DECIMAL(65, 30);

      SELECT
        SUM(pendingBalance), SUM(availableBalance)
        INTO total_pending, total_available
      FROM account_balances
      WHERE (
        userId = user_id and
        assetId = asset_id
      );

      INSERT INTO user_balances (userId, assetId, pendingBalance, availableBalance)
      VALUES (user_id, asset_id, total_pending, total_available)
      ON DUPLICATE KEY UPDATE pendingBalance=total_pending, availableBalance=total_available;
    END
    `);

  await knex.raw(`DROP TRIGGER IF EXISTS balance_logs_update_trigger;`);
  await knex.raw(`CREATE TRIGGER balance_logs_update_trigger
      AFTER UPDATE on balance_logs
      FOR EACH ROW
    BEGIN
      IF OLD.amount != NEW.amount
      THEN
           SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Error: cannot change the amount of a transaction';
      END IF;

      IF OLD.state = "confirmed" AND NEW.state != "confirmed"
      THEN
           SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Error: "confirmed" is a final state';
      END IF;

    	CALL update_account_balance(NEW.accountId, NEW.userId, NEW.assetId);
    END`);
  await knex.raw(`DROP TRIGGER IF EXISTS balance_logs_insert_trigger;`);
  await knex.raw(`CREATE TRIGGER balance_logs_insert_trigger
      AFTER INSERT on balance_logs
      FOR EACH ROW
    BEGIN
    	CALL update_account_balance(NEW.accountId, NEW.userId, NEW.assetId);
    END`);

  await knex.raw(`DROP TRIGGER IF EXISTS account_balances_insert_trigger;`);
  await knex.raw(`CREATE TRIGGER account_balances_insert_trigger
        AFTER INSERT on account_balances
        FOR EACH ROW
      BEGIN
        CALL update_user_balance(NEW.userId, NEW.assetId);
      END`);
  await knex.raw(`DROP TRIGGER IF EXISTS account_balances_update_trigger;`);
  await knex.raw(`CREATE TRIGGER account_balances_update_trigger
        AFTER UPDATE on account_balances
        FOR EACH ROW
      BEGIN
        CALL update_user_balance(NEW.userId, NEW.assetId);
      END`);
};

exports.down = async (knex: Knex<*>, Promise: Promise<*>) => {
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("accounts");
  await knex.schema.dropTableIfExists("user_accounts");
  await knex.schema.dropTableIfExists("user_balances");
  await knex.schema.dropTableIfExists("eth_accounts");
  await knex.schema.dropTableIfExists("account_balances");
  await knex.schema.dropTableIfExists("balance_logs");
  await knex.raw(`
    DROP TRIGGER IF EXISTS account_balances_update_trigger;
  `);
  await knex.raw(`
    DROP PROCEDURE IF EXISTS update_user_balance;
  `);
  await knex.raw(`
    DROP PROCEDURE IF EXISTS update_account_balance;
  `);
  await knex.raw(`
    DROP TRIGGER IF EXISTS balance_logs_insert_trigger;
  `);
  await knex.raw(`
    DROP TRIGGER IF EXISTS balance_logs_update_trigger;
  `);
};
