//@flow
/* eslint-disable no-unused-vars */
import Knex from "knex";
import express from "express";
import { BigNumber } from "bignumber.js";
import * as models from "src/hancock/models";

import {
  ABI,
  decimals,
  contractAddress
} from "src/lib/ethereum/abi/ropsten/test-standard-token";

import BaseModel from "src/lib/BaseModel";
import EthSession from "src/lib/ethereum/EthSession";
import EthereumAccount from "src/hancock/models/EthereumAccount";

import { apiErrorMiddleware } from "src/lib/express";

export const clearTable = async (modelName: string) => {
  const knex: Knex<*> = BaseModel.knex();

  const model: Class<BaseModel<*>> = models[modelName];
  if (model == null) {
    console.warn(`model not found ${modelName}`);
    return;
  }

  await knex(model.tableName).del();
};

export const clearAllTables = async () => {
  const knex: Knex<*> = BaseModel.knex();
  // $FlowFixMe
  for (const model: Class<BaseModel> of Object.values(models)) {
    await model.query().delete();
  }
};

export const randomStringId = (length: number = 32): string => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
};

export const randomId = (): number => Math.floor(Math.random() * 1000) + 1;

export const createTestAssets = async () => {
  await models.Asset.insert({
    name: "Test Token",
    type: "erc20",
    ticker: "TST",
    decimals: decimals,
    abi: JSON.stringify(ABI),
    contractAddress: contractAddress
  });

  await models.Asset.insert({
    name: "Ether",
    type: "coin",
    ticker: "ETH",
    decimals: EthSession.DECIMALS
  });
};

export const createAccount = async ({
  address,
  privateKey,
  lastNonce,
  gasBalanceWei
}: {
  address: string,
  privateKey: string,
  lastNonce: number,
  gasBalanceWei?: BigNumber
}): Promise<EthereumAccount> => {
  return models.EthereumAccount.insert({
    address,
    privateKey,
    lastNonce,
    gasBalanceWei: (gasBalanceWei || new BigNumber("1e18")).toString()
  });
};
