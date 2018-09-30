//@flow
import { BigNumber } from "bignumber.js";

import type { EthUnit } from "src/lib/ethereum/typedef";

import Asset from "./models/Asset";
import Web3Session from "src/lib/ethereum/Web3Session";
import EthereumTransaction from "./models/EthereumTransaction";

export default class FeeEstimator {
  static async getMostRecentTransaction(
    asset: Asset
  ): Promise<?EthereumTransaction> {
    return EthereumTransaction.query()
      .where("assetId", asset.attr.id)
      .where("state", "confirmed")
      .orderBy("updatedAt", "desc")
      .first();
  }

  static async estimateGasUsage(asset: Asset): Promise<BigNumber> {
    if (!asset.isEth && !asset.isErc20) {
      throw `asset must be ethereum based for now`;
    }

    const latestTxn = await this.getMostRecentTransaction(asset);
    if (latestTxn != null) {
      const { gasUsedBN } = latestTxn;
      if (gasUsedBN != null) {
        return gasUsedBN.times(1.5);
      }
    }

    return new BigNumber(37000).times(1.5);
  }

  static async estimateGasPrice(
    asset: Asset,
    unit: EthUnit = "wei"
  ): Promise<BigNumber> {
    const session = Web3Session.createSession();
    const latestTxn = await this.getMostRecentTransaction(asset);
    if (latestTxn != null) {
      const { gasPriceWeiBN } = latestTxn;
      if (gasPriceWeiBN != null) {
        return session.fromWei(gasPriceWeiBN, unit);
      }
    }

    return session.toWei("0.0000000051", "ether");
  }

  static async estimateFee(asset: Asset): Promise<?BigNumber> {
    if (asset.isEth || asset.isErc20) {
      const gasPrice = await this.estimateGasPrice(asset, "ether");
      const gasUsage = await this.estimateGasUsage(asset);
      return gasPrice.times(gasUsage);
    }

    return null;
  }
}
