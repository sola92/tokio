//@flow
/* eslint-disable no-unused-vars */
import "src/hancock/init-db";
import {
  createAccount,
  clearAllTables,
  createTestAssets,
  createHouseUser
} from "src/test/util";
import { createUser } from "src/test/util";
import { BigNumber } from "bignumber.js";
import Web3Session from "src/lib/ethereum/Web3Session";

import {
  User,
  Account,
  Asset,
  EthereumTransaction,
  AccountBalance
} from "src/hancock/models";

require("dotenv").config();
const TEST_ACCOUNT: string = process.env.ROPSTEN_ACCOUNT || "";
const TEST_ACCOUNT_KEY: string = process.env.ROPSTEN_ACCOUNT_KEY || "";

(async () => {
  const session = Web3Session.createSession();
  const lastNonce = await session.getTransactionCount(TEST_ACCOUNT);
  await clearAllTables();
  await createTestAssets();

  const eth = await Asset.fromTicker("eth");

  const account = await createAccount({
    address: TEST_ACCOUNT,
    assetId: eth.id,
    privateKey: TEST_ACCOUNT_KEY,
    lastNonce
  });

  const user = await createUser({ isHouse: true })
    .withAssetBalance({
      asset: eth,
      address: TEST_ACCOUNT,
      balance: new BigNumber(1)
    })
    .build();

  const tst = await Asset.fromTicker("tst");
  await createAccount({
    address: TEST_ACCOUNT,
    assetId: tst.id,
    privateKey: TEST_ACCOUNT_KEY,
    lastNonce
  });

  process.exit(0);
})();
