//@flow
import { BigNumber } from "bignumber.js";
import BaseModel from "../../lib/BaseModel";
import type { BaseFields } from "src/lib/BaseModel";

import Web3Session from "src/lib/ethereum/Web3Session";

export type State = "pending" | "confirmed" | "fully_confirmed" | "cancelled";
export type Fields = BaseFields & {
  to: EthAddress,
  hash?: string,
  data?: ?string,
  from: EthAddress,
  value: string,
  gasLimit?: string,
  gasUsed?: string,
  gasPriceWei?: string,
  numRetries: number,
  blockNumber?: ?number,
  chainId: number,
  nonce: number,
  assetId: number,
  contractAddress: ?EthAddress,
  state: State
};

export default class EthereumTransaction extends BaseModel<Fields> {
  static tableName = "eth_transaction";

  get isERC20(): boolean {
    return this.attr.contractAddress != null;
  }

  get valueBN(): BigNumber {
    return new BigNumber(this.attr.value);
  }

  get gasUsedBN(): ?BigNumber {
    return this.attr.gasUsed != null ? new BigNumber(this.attr.gasUsed) : null;
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

  get confirmed() {
    const { state, blockNumber } = this.attr;
    return state == "confirmed" && blockNumber != null;
  }

  async syncWithNetwork(): Promise<boolean> {
    const { hash } = this.attr;
    if (this.confirmed) {
      return true;
    }

    if (hash == null) {
      return false;
    }

    const session = Web3Session.createSession();
    const w3Txn = await session.getTransaction(hash);
    if (w3Txn == null) {
      return false;
    }

    await this.update({ blockNumber: w3Txn.blockNumber, state: "confirmed" });
    return true;
  }
}
