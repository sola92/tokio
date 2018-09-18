//@flow
import { BigNumber } from "bignumber.js";
import BaseModel from "../../lib/BaseModel";
import type { BaseFields } from "src/lib/BaseModel";

export type State = "pending" | "confirmed" | "fully_confirmed";
export type Fields = BaseFields & {
  to: EthAddress,
  hash?: string,
  data?: ?string,
  from: EthAddress,
  value: string,
  ticker: string,
  gasLimit?: string,
  gasPriceWei?: string,
  numRetries: number,
  blockNumber?: ?number,
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

  get gasPriceWeiBN(): ?BigNumber {
    return this.attr.gasPriceWei != null
      ? new BigNumber(this.attr.gasPriceWei)
      : null;
  }

  get gasLimitBN(): ?BigNumber {
    return this.attr.gasLimit != null
      ? new BigNumber(this.attr.gasLimit)
      : null;
  }
}
