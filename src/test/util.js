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
import User from "src/hancock/models/User";
import Asset from "src/hancock/models/Asset";
import Account from "src/hancock/models/Account";
import BalanceEvent from "src/hancock/models/BalanceEvent";
import EthSession from "src/lib/ethereum/EthSession";
import Web3Session from "src/lib/ethereum/Web3Session";

import { apiErrorMiddleware } from "src/lib/express";

import uuidv1 from "uuid/v1";

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

export const randomString = (): string => uuidv1();

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
  assetId,
  privateKey,
  lastNonce
}: {
  assetId: number,
  address: string,
  privateKey: string,
  lastNonce: number
}): Promise<Account> => {
  return models.Account.insert({
    address,
    assetId,
    lastNonce,
    privateKey
  });
};

export const createRandomEthAccount = async (): Promise<Account> => {
  const eth = await Asset.fromTicker("eth");
  const session = Web3Session.createRopstenSession();
  const w3Account = session.createAccount(session.randomHex(32));
  return models.Account.insert({
    address: w3Account.address,
    assetId: eth.attr.id,
    lastNonce: 0,
    privateKey: w3Account.privateKey
  });
};

export const depositToAccount = async (
  account: Account,
  userId: number,
  assetId: number,
  amount: BigNumber
): Promise<BalanceEvent> => {
  return BalanceEvent.insert({
    userId: userId,
    accountId: account.attr.id,
    assetId: assetId,
    amount: amount.toString(),
    action: "deposit",
    state: "confirmed",
    note: "note"
  });
};

export const createUserWithEthAccount = async (
  balance: BigNumber,
  houseBalance: BigNumber
): Promise<User> => {
  const user = await User.insert({});
  const eth = await Asset.fromTicker("eth");
  const account = await createRandomEthAccount();
  await user.addAccount(account);
  await depositToAccount(account, user.id, eth.id, balance);

  const house = await User.getHouseUser();
  await depositToAccount(account, house.id, eth.id, houseBalance);
  return user;
};

export const createHouseUser = async (): Promise<User> => {
  return User.insert({ isHouse: true });
};
