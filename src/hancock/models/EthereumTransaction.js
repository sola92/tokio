//@flow
import { BigNumber } from "bignumber.js";
import BaseModel from "src/lib/BaseModel";
import type { BaseFields } from "src/lib/BaseModel";

import { ETH_ADDRESS_LENGTH } from "./EthereumAccount";

export type State = "pending" | "confirmed" | "fully_confirmed";
export type Fields = BaseFields & {
  to: EthAddress,
  hash: string,
  data: string,
  from: EthAddress,
  value: string,
  ticker: string,
  gasLimit: string,
  gasPrice: string,
  numRetries: number,
  blockNumber: ?number,
  chainId: number,
  nonce: number,
  contractAddress: ?EthAddress,
  state: State
};

export default class EthereumTransaction extends BaseModel<Fields> {
  static tableName = "eth_transaction";

  get publicId(): string {
    return `${this.attr.ticker}-${this.attr.id}`;
  }

  get isERC20(): boolean {
    return this.attr.contractAddress != null;
  }

  get valueBN(): BigNumber {
    return new BigNumber(this.attr.value);
  }

  get gasPriceBN(): BigNumber {
    return new BigNumber(this.attr.gasPrice);
  }

  get gasLimitBN(): BigNumber {
    return new BigNumber(this.attr.gasLimit);
  }

  static getPendingTransactions({
    from
  }: {
    from: EthAddress
  }): Promise<Array<EthereumTransaction>> {
    return this.query()
      .where("from", from)
      .where("state", "pending");
  }

  static jsonSchema = {
    required: [
      "to",
      "from",
      "hash",
      "value",
      "data",
      "gasLimit",
      "gasPrice",
      "nonce",
      "ticker"
    ],

    properties: {
      hash: { type: "string", minLength: 40, maxLength: 100 },
      to: {
        type: "string",
        length: ETH_ADDRESS_LENGTH
      },
      from: {
        type: "string",
        length: ETH_ADDRESS_LENGTH
      },
      contractAddress: {
        type: ["string", "null"],
        length: ETH_ADDRESS_LENGTH
      },
      blockNumber: { type: ["number", "null"] },
      chainId: { type: "number" },
      nonce: { type: "number" },
      state: { type: "string" },
      ticker: { type: "string" }
    }
  };
}
