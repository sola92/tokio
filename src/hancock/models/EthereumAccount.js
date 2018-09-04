//@flow
import { BigNumber } from "bignumber.js";
import type { Knex, $QueryBuilder, Knex$Transaction } from "knex";

import Asset from "./Asset";
import BaseModel from "src/lib/BaseModel";
import EthSession from "src/lib/ethereum/EthSession";
import Web3Session from "src/lib/ethereum/Web3Session";
import Erc20Session from "src/lib/ethereum/Erc20Session";

import {
  LockReleaseError,
  InvalidBalanceError,
  LockAcquisitionError
} from "../errors";

import type { BaseFields } from "src/lib/BaseModel";

export const ETH_ADDRESS_LENGTH = 42;

const DEFAULT_LOCK_TTL_MS = 1000 * 60 * 60 * 60 * 2; // 2 Hours

export type Fields = BaseFields & {
  address: EthAddress,
  lastNonce: number,
  gasBalance: string,
  lockExpireTime: ?number,
  // temporary storage of PK for easy retrieval
  privateKey: string
};

export default class EthereumAccount extends BaseModel<Fields> {
  static tableName = "eth_accounts";

  get gasBalanceBN(): BigNumber {
    return new BigNumber(this.attr.gasBalance);
  }

  async incrementGasBalance(trx: Knex$Transaction, incr: BigNumber) {
    const newBalance = this.gasBalanceBN.plus(incr);
    if (newBalance.isLessThan(0)) {
      throw new InvalidBalanceError(
        `gas balance cannot be less than zero: ${newBalance.toString()}`
      );
    }

    return this.update({ gasBalance: newBalance.toString() }, trx);
  }

  async transaction(fn: (trx: Knex$Transaction) => Promise<void>) {
    await this.lock();
    const knex: Knex = this.constructor.knex();
    await knex.transaction(trx => fn(trx));
    await this.unlock();
  }

  async lock(
    { ttlMs }: { ttlMs: number } = { ttlMs: DEFAULT_LOCK_TTL_MS }
  ): Promise<boolean> {
    const { address } = this.attr;
    const now = new Date().getTime();
    const numUpdated: number = await EthereumAccount.query()
      .where("address", address)
      .where(
        (builder: $QueryBuilder<number>): void => {
          builder
            .where("lockExpireTime", null)
            .orWhere("lockExpireTime", "<", now);
        }
      )
      .update({ lockExpireTime: now + ttlMs });

    if (numUpdated == 0) {
      await this.refresh();
      throw new LockAcquisitionError(
        `failed to acquire account lock: ${address}`,
        this.attr.lockExpireTime
      );
    }

    return true;
  }

  async unlock(
    { ttlMs }: { ttlMs: number } = { ttlMs: DEFAULT_LOCK_TTL_MS }
  ): Promise<boolean> {
    const { lockExpireTime, address } = this.attr;

    const numUpdated: number = await EthereumAccount.query()
      .where("address", address)
      .where(
        (builder: $QueryBuilder<number>): void => {
          builder
            .where("lockExpireTime", null)
            .orWhere("lockExpireTime", "<=", lockExpireTime);
        }
      )
      .update({ lockExpireTime: null });

    if (numUpdated == 0) {
      await this.refresh();
      throw new LockReleaseError(
        `failed to release account lock: ${address}. expired`,
        this.attr.lockExpireTime
      );
    }

    return true;
  }

  async getTokenBalance(ticker: string): Promise<?BigNumber> {
    const web3session = Web3Session.createSession();
    if (ticker.toLowerCase() === EthSession.TICKER.toLowerCase()) {
      return await web3session.getEthBalance(this.attr.address);
    }

    const asset: ?Asset = await Asset.fromTicker(ticker);
    if (asset == null) {
      return null;
    }

    const {
      ABI,
      attr: { contractAddress, decimals }
    } = asset;
    if (ABI == null || contractAddress == null || decimals == null) {
      return null;
    }

    const contract = new web3session.web3.eth.Contract(ABI, contractAddress, {
      // issuer can be recipient here, doesn't matter.
      from: this.attr.address
    });

    const erc20Session = new Erc20Session({
      session: web3session,
      contract,
      ticker: "TST",
      decimals: decimals,
      fromAddress: this.attr.address
    });

    return await erc20Session.getBalance({ inContractPrecision: false });
  }

  static jsonSchema = {
    type: "object",
    required: ["address"],

    properties: {
      address: {
        type: "string",
        length: ETH_ADDRESS_LENGTH
      },
      lastNonce: {
        type: "number"
      },
      gasBalance: { type: "string" },
      lockedTime: { type: "integer" }
    }
  };
}
