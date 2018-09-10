//@flow
import { BigNumber } from "bignumber.js";
import { transaction } from "objection";
import type { Knex$Transaction, $QueryBuilder } from "knex";

import Asset from "./Asset";
import BaseModel from "src/lib/BaseModel";
import EthSession from "src/lib/ethereum/EthSession";
import Web3Session from "src/lib/ethereum/Web3Session";
import Erc20Session from "src/lib/ethereum/Erc20Session";

import {
  AccountBusyError,
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
  gasBalanceWei: string,
  lockExpireTimeMs: ?number,
  // temporary storage of PK for easy retrieval
  privateKey: string
};

export default class EthereumAccount extends BaseModel<Fields> {
  static tableName = "eth_accounts";

  get gasBalanceWeiBN(): BigNumber {
    return new BigNumber(this.attr.gasBalanceWei);
  }

  static async findByAddress(address: string): Promise<?this> {
    return this.findOne({ address });
  }

  async incrementGasBalanceWei(trx: Knex$Transaction, incrWei: BigNumber) {
    const newBalance = this.gasBalanceWeiBN.plus(incrWei);
    if (newBalance.isLessThan(0)) {
      throw new InvalidBalanceError(
        `gas balance cannot be less than zero: ${newBalance.toString()}`
      );
    }

    return this.update({ gasBalanceWei: newBalance.toString() }, trx);
  }

  async fetchAndIncrementNonce() {
    const { lastNonce } = this.attr;

    const numUpdated: number = await EthereumAccount.query()
      .patch({ lastNonce: lastNonce + 1 })
      .where("lastNonce", lastNonce);

    if (numUpdated != 1) {
      throw new AccountBusyError("failed to increment nonce");
    }

    return lastNonce + 1;
  }

  async transaction(fn: (trx: Knex$Transaction) => Promise<void>) {
    await this.lock();
    let trx: ?Knex$Transaction;
    try {
      trx = await transaction.start(this.constructor.knex());
      await fn(trx);
      await trx.commit();
    } catch (err) {
      if (trx) {
        await trx.rollback();
      }
      throw err;
    } finally {
      await this.releaseLock();
    }
  }

  async lock(
    { ttlMs }: { ttlMs: number } = { ttlMs: DEFAULT_LOCK_TTL_MS }
  ): Promise<boolean> {
    await this.refresh();
    const { address } = this.attr;
    const now = new Date().getTime();

    const numUpdated: number = await EthereumAccount.query()
      .patch({ lockExpireTimeMs: now + ttlMs })
      .where("address", address)
      .where(
        (builder: $QueryBuilder<number>): void => {
          builder
            .where("lockExpireTimeMs", null)
            .orWhere("lockExpireTimeMs", "<", now);
        }
      );

    if (numUpdated == 0) {
      await this.refresh();
      throw new LockAcquisitionError(
        `failed to acquire account lock: ${address}`,
        this.attr.lockExpireTimeMs
      );
    }

    return true;
  }

  async releaseLock(
    { ttlMs }: { ttlMs: number } = { ttlMs: DEFAULT_LOCK_TTL_MS }
  ): Promise<boolean> {
    await this.refresh();
    const {
      attr: { address, lockExpireTimeMs }
    } = this;

    const numUpdated: number = await EthereumAccount.query()
      .patch({ lockExpireTimeMs: null })
      .where("address", address)
      .where(
        (builder: $QueryBuilder<number>): void => {
          builder
            .where("lockExpireTimeMs", null)
            .orWhere("lockExpireTimeMs", "<=", lockExpireTimeMs);
        }
      );

    if (numUpdated == 0) {
      await this.refresh();
      throw new LockReleaseError(
        `failed to release account lock: ${address}`,
        this.attr.lockExpireTimeMs
      );
    }

    return true;
  }

  async getTokenBalance(ticker: string): Promise<?BigNumber> {
    const web3session = Web3Session.createSession();
    if (ticker.toLowerCase() === EthSession.TICKER.toLowerCase()) {
      const session = new EthSession({
        session: web3session,
        fromAddress: this.attr.address
      });
      return await session.getBalance({ inEthPrecision: false });
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
    // required: ["address"],

    properties: {
      address: {
        type: "string",
        length: ETH_ADDRESS_LENGTH
      },
      lastNonce: {
        type: "number"
      },
      gasBalanceWei: { type: "string" },
      lockExpireTimeMs: { type: ["number", "null"] }
    }
  };
}
