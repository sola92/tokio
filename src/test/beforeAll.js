//@flow
/* eslint-disable no-unused-vars */
import "src/hancock/init-db";
import { createAccount, clearAllTables, createTestAssets } from "src/test/util";
import { BigNumber } from "bignumber.js";
import Web3Session from "src/lib/ethereum/Web3Session";

require("dotenv").config();
const TEST_ACCOUNT: string = process.env.ROPSTEN_ACCOUNT || "";
const TEST_ACCOUNT_KEY: string = process.env.ROPSTEN_ACCOUNT_KEY || "";

(async () => {
  const session = Web3Session.createSession();
  const lastNonce = await session.getTransactionCount(TEST_ACCOUNT);
  await clearAllTables();
  await createTestAssets();
  await createAccount({
    address: TEST_ACCOUNT,
    lastNonce,
    privateKey: TEST_ACCOUNT_KEY,
    gasBalanceWei: new BigNumber("1e18")
  });
  process.exit(0);
})();
