//@flow
import Web3Session from "src/lib/ethereum/Web3Session";
import EthereumTransaction from "src/hancock/models/EthereumTransaction";

export default class EthereumBlockScanner {
  scanIntervalMs: number;
  scanTimeoutID: ?TimeoutID;

  constructor(
    { scanIntervalMs }: { scanIntervalMs: number } = {
      scanIntervalMs: Web3Session.AVG_BLOCK_TIME_SECS * 1000
    }
  ) {
    this.scanIntervalMs = scanIntervalMs;
  }

  async scan() {
    const pendingTxns: Array<
      EthereumTransaction
    > = await EthereumTransaction.query().where("state", "pending");

    for (const txn of pendingTxns) {
      txn.syncWithNetwork();
    }

    this.sleep();
  }

  sleep() {
    const { scanIntervalMs, scanTimeoutID } = this;
    if (scanTimeoutID != null) {
      return;
    }

    this.scanTimeoutID = setTimeout(() => this.scan(), scanIntervalMs);
  }

  start() {
    this.scan();
  }
}
