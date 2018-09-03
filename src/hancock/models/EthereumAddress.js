//@flow
import BaseModel from "./BaseModel";
import type { BaseFields } from "./BaseModel";

export const ETH_ADDRESS_LENGTH = 42;

export type Fields = BaseFields & {
  address: string,
  lastNonce: number
};

export default class EthereumAddress extends BaseModel<Fields> {
  static tableName = "eth_addresses";

  static jsonSchema = {
    type: "object",
    required: ["address"],

    properties: {
      address: {
        type: "string",
        minLength: ETH_ADDRESS_LENGTH,
        maxLength: ETH_ADDRESS_LENGTH
      },
      lastNonce: {
        type: "number"
      }
    }
  };
}
