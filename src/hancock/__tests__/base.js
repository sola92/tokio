//@flow
/* eslint-disable no-unused-vars */
import "jest";
import "../init-db";
import Knex from "knex";
import { Model } from "objection";
import * as models from "../models";

import {
  ABI,
  decimals,
  contractAddress
} from "src/lib/ethereum/abi/ropsten/test-standard-token";

import EthSession from "src/lib/ethereum/EthSession";

export const clearTable = async (modelName: string) => {
  const knex: Knex<*> = Model.knex();

  const model: Class<Model> = models[modelName];
  if (model == null) {
    console.warn(`model not found ${modelName}`);
    return;
  }

  await knex(model.tableName).del();
};

export const clearAllTables = async () => {
  const knex: Knex<*> = Model.knex();
  // $FlowFixMe
  for (const model: Class<Model> of Object.values(models)) {
    console.log("clearing table", model.tableName);
    await knex(model.tableName).del();
  }
};

const wait = (milliseconds: number): Promise<*> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), milliseconds);
  });
};

beforeAll(async () => {
  // await clearAllTables();

  const ropstenKey = process.env.ROPSTEN_ACCOUNT_KEY || "";
  const ropstenAddr = process.env.ROPSTEN_ACCOUNT || "";
  const a = await models.EthereumAccount.findOne({ address: ropstenAddr });
  if (!a) {
    await models.EthereumAccount.query().insert({
      address: ropstenAddr,
      privateKey: ropstenKey
    });
  }

  const tstAsset = await models.Asset.findOne({ ticker: "TST" });
  if (!tstAsset) {
    await models.Asset.query().insert({
      name: "Test Token",
      type: "erc20",
      ticker: "TST",
      decimals: decimals,
      abi: JSON.stringify(ABI),
      contractAddress: contractAddress
    });
  }

  const ethAsset = await models.Asset.findOne({ ticker: "ETH" });
  if (!ethAsset) {
    await models.Asset.query().insert({
      name: "Ether",
      type: "coin",
      ticker: "ETH",
      decimals: EthSession.DECIMALS
    });
  }
});

test("noop test so jest doesnt complain", () => {});
