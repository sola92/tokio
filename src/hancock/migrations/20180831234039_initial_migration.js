//@flow
import Knex from "knex";

exports.up = async (knex: Knex<*>, Promise: Promise<*>) => {
  await knex.schema.createTable("account_balances", table => {
    table.increments("id").primary();
    table.timestamp("createdAt", 3).defaultTo(knex.fn.now(3));
    table.timestamp("updatedAt", 3).defaultTo(knex.fn.now(3));

    table
      .decimal("totalPending", 65, 30)
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
      .decimal("totalPending", 65, 30)
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

  await knex.schema.createTable("balance_events", table => {
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

    table.integer("withdrawalId").nullable();

    table
      .text("note")
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

    table
      .boolean("isHouse")
      .notNullable()
      .defaultTo(false);
  });

  await knex.schema.createTable("accounts", table => {
    table.increments("id").primary();
    table.timestamp("createdAt", 3).defaultTo(knex.fn.now(3));
    table.timestamp("updatedAt", 3).defaultTo(knex.fn.now(3));

    table.integer("assetId").notNullable();
    table.string("address", 300).notNullable();
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
      DECLARE total_pending DECIMAL(65, 30);
      SELECT SUM(amount) INTO available_balance FROM balance_events
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

      SELECT SUM(amount) INTO total_pending FROM balance_events
      WHERE (
        userId = user_id and
        assetId = asset_id and
        accountId = account_id and
        state = "pending"
      );

      IF available_balance IS NULL THEN
        SET available_balance := 0;
      END IF;

      IF total_pending IS NULL THEN
        SET total_pending := 0;
      END IF;

      IF available_balance < 0
      THEN
         SIGNAL SQLSTATE '45000'
           SET MESSAGE_TEXT = 'Error: available balance cannot be less than zero!';
      END IF;

      IF available_balance + total_pending < 0
      THEN
         SIGNAL SQLSTATE '45000'
           SET MESSAGE_TEXT = 'Error: Pending overdraw!';
      END IF;

      INSERT INTO account_balances (userId, accountId, assetId, totalPending, availableBalance)
      VALUES (user_id, account_id, asset_id, total_pending, available_balance)
      ON DUPLICATE KEY UPDATE totalPending=total_pending, availableBalance=available_balance;
  END
  `);

  await knex.raw(`DROP PROCEDURE IF EXISTS update_user_balance;`);
  await knex.raw(`
    CREATE PROCEDURE update_user_balance (IN user_id INT, IN asset_id INT)
    BEGIN
      DECLARE total_available DECIMAL(65, 30);
      DECLARE total_pending DECIMAL(65, 30);

      SELECT
        SUM(totalPending), SUM(availableBalance)
        INTO total_pending, total_available
      FROM account_balances
      WHERE (
        userId = user_id and
        assetId = asset_id
      );

      INSERT INTO user_balances (userId, assetId, totalPending, availableBalance)
      VALUES (user_id, asset_id, total_pending, total_available)
      ON DUPLICATE KEY UPDATE totalPending=total_pending, availableBalance=total_available;
    END
    `);

  await knex.raw(`DROP TRIGGER IF EXISTS balance_events_update_trigger;`);
  await knex.raw(`CREATE TRIGGER balance_events_update_trigger
      AFTER UPDATE on balance_events
      FOR EACH ROW
    BEGIN
      IF OLD.amount != NEW.amount
      THEN
           SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Error: cannot change the amount of a balance event';
      END IF;

      IF OLD.accountId != NEW.accountId
      THEN
           SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Error: cannot change the accountId of a balance event';
      END IF;

      IF OLD.userId != NEW.userId
      THEN
           SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Error: cannot change the userId of a balance event';
      END IF;

      IF OLD.assetId != NEW.assetId
      THEN
           SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Error: cannot change the assetId of a balance event';
      END IF;

      IF OLD.action != NEW.action
      THEN
           SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Error: cannot change the action of a balance event';
      END IF;

      IF OLD.state = "confirmed" AND NEW.state != "confirmed"
      THEN
           SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Error: "confirmed" is a final state';
      END IF;

      IF OLD.state = "cancelled" AND NEW.state != "cancelled"
      THEN
           SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Error: "cancelled" is a final state';
      END IF;

    	CALL update_account_balance(NEW.accountId, NEW.userId, NEW.assetId);
    END`);
  await knex.raw(`DROP TRIGGER IF EXISTS balance_events_insert_trigger;`);
  await knex.raw(`CREATE TRIGGER balance_events_insert_trigger
      AFTER INSERT on balance_events
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
  await knex.schema.dropTableIfExists("balance_events");
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
    DROP TRIGGER IF EXISTS balance_events_insert_trigger;
  `);
  await knex.raw(`
    DROP TRIGGER IF EXISTS balance_events_update_trigger;
  `);
};
