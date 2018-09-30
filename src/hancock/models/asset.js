//@flow
import BaseModel from "src/lib/BaseModel";
import type { BaseFields } from "src/lib/BaseModel";
import type { ContractAbi } from "src/lib/ethereum/typedef";

export const ETH_ADDRESS_LENGTH = 42;

export type AssetType = "erc20" | "coin";

export type Fields = BaseFields & {
  abi?: string,
  name: string,
  type: AssetType,
  ticker: string,
  decimals?: number,
  contractAddress?: EthAddress
};

export default class Asset extends BaseModel<Fields> {
  static tableName = "assets";

  isTicker(ticker: string): boolean {
    return this.attr.ticker.toLowerCase() == ticker.toLowerCase();
  }

  get ABI(): ?ContractAbi {
    if (this.attr.abi == null) {
      return null;
    }

    return JSON.parse(this.attr.abi);
  }

  get isEth(): boolean {
    return this.isTicker("eth");
  }

  get isErc20(): boolean {
    const { ABI, contractAddress } = this.attr;
    return ABI != null && contractAddress != null;
  }

  static fromTicker(ticker: string): Promise<Asset> {
    // $FlowFixMe
    return this.findOne({ ticker: ticker.toUpperCase() });
  }

  static fromTickerOptional(ticker: string): Promise<?Asset> {
    return this.findOne({ ticker: ticker.toUpperCase() });
  }

  static jsonSchema = {
    type: "object",
    required: ["name", "ticker"],

    properties: {
      contractAddress: {
        type: ["string", "null"],
        length: ETH_ADDRESS_LENGTH
      },
      name: {
        type: "string"
      },
      ticker: {
        type: "string"
      },
      type: {
        type: "string"
      },
      decimals: { type: ["number", "null"] }
    }
  };
}
