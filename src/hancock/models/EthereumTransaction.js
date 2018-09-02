//@flow
import { BigNumber } from "bignumber.js";
import BaseModel from "./BaseModel";
import type { BaseFields } from "./BaseModel";

import { ETH_ADDRESS_LENGTH } from "./EthereumAddress";

export type Fields = BaseFields & {
  to: EthAddress,
  hash: string,
  data: string,
  from: EthAddress,
  value: string,
  gasLimit: string,
  gasPrice: string,
  numRetries: number,
  blockNumber: ?number,
  chainId: number,
  contractAddress: ?EthAddress
};

export default class EthereumTransaction extends BaseModel<Fields> {
  static tableName = "eth_transaction";

  get valueBN(): BigNumber {
    return new BigNumber(this.attr.value);
  }

  get gasPriceBN(): BigNumber {
    return new BigNumber(this.attr.gasPrice);
  }

  get gasLimitBN(): BigNumber {
    return new BigNumber(this.attr.gasLimit);
  }

  static jsonSchema = {
    required: ["to", "from", "hash", "value", "data", "gasLimit", "gasPrice"],

    properties: {
      hash: { type: "string", minLength: 40, maxLength: 100 },
      to: {
        type: "string",
        minLength: ETH_ADDRESS_LENGTH,
        maxLength: ETH_ADDRESS_LENGTH
      },
      from: {
        type: "string",
        minLength: ETH_ADDRESS_LENGTH,
        maxLength: ETH_ADDRESS_LENGTH
      },
      contractAddress: {
        type: ["string", "null"],
        minLength: ETH_ADDRESS_LENGTH,
        maxLength: ETH_ADDRESS_LENGTH
      },
      blockNumber: { type: ["number", "null"] },
      chainId: { type: "number" }
    }
  };
}
