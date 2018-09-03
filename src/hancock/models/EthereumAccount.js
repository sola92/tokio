//@flow
import { BigNumber } from "bignumber.js";

import Asset from "./Asset";
import BaseModel from "src/lib/BaseModel";
import EthSession from "src/lib/ethereum/EthSession";
import Web3Session from "src/lib/ethereum/Web3Session";
import Erc20Session from "src/lib/ethereum/Erc20Session";

import type { BaseFields } from "src/lib/BaseModel";

export const ETH_ADDRESS_LENGTH = 42;

export type Fields = BaseFields & {
  address: EthAddress,
  lastNonce: number,
  privateKey: string
};

export default class EthereumAccount extends BaseModel<Fields> {
  static tableName = "eth_accounts";

  async getBalance(ticker: string): Promise<?BigNumber> {
    const web3session = Web3Session.createSession();
    if (ticker === EthSession.TICKER) {
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
      }
    }
  };
}
