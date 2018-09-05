//@flow
/* eslint-disable no-unused-vars */
import "src/hancock/init-db";
import { createAccount, clearAllTables, createTestAssets } from "src/test/util";
import { BigNumber } from "bignumber.js";

require("dotenv").config();
const TEST_ACCOUNT: string = process.env.ROPSTEN_ACCOUNT || "";
const TEST_ACCOUNT_KEY: string = process.env.ROPSTEN_ACCOUNT_KEY || "";

(async () => {
  await clearAllTables();
  await createTestAssets();
  await createAccount({
    address: TEST_ACCOUNT,
    privateKey: TEST_ACCOUNT_KEY,
    gasBalanceWei: new BigNumber("1e18")
  });
  process.exit(0);
})();
