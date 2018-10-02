//@flow
import EthereumTx from "ethereumjs-tx";
import { BigNumber } from "bignumber.js";
import Web3Session from "./Web3Session";

import {
  InvalidAddressError,
  DuplicateOperationError,
  UnsignedTransactionError,
  InsufficientBalanceError,
  MissingConfigError
} from "./errors";

export default class EthTransferBuilder {
  session: Web3Session;
  senderAddress: ?EthAddress;
  toAddress: ?EthAddress;
  transferAmount: ?BigNumber;
  nonce: ?number;
  gasPriceWei: ?BigNumber;
  gasLimit: ?BigNumber;

  hash: ?string;
  transaction: ?EthereumTx;
  txSent: boolean = false;

  setSession(session: Web3Session): this {
    this.session = session;
    return this;
  }

  setSenderAddress(address: EthAddress): this {
    this.senderAddress = address;
    return this;
  }

  setToAddress(address: EthAddress): this {
    this.toAddress = address;
    return this;
  }

  setNonce(nonce: number): this {
    this.nonce = nonce;
    return this;
  }

  setTransferAmount(transferAmount: BigNumber): this {
    this.transferAmount = transferAmount;
    return this;
  }

  setGasPriceWei(gasPriceWei: BigNumber): this {
    this.gasPriceWei = gasPriceWei;
    return this;
  }

  setGasLimit(gasLimit: BigNumber): this {
    this.gasLimit = gasLimit;
    return this;
  }

  async build(privateKey: string): Promise<EthereumTx> {
    const {
      session,
      toAddress,
      senderAddress,
      transferAmount
    } = this.validateConfiguration();

    if (this.transaction != null) {
      throw new DuplicateOperationError(`transaction has already been built`);
    }

    if (!session.isAddress(toAddress)) {
      throw new InvalidAddressError(toAddress, "ETH");
    }

    const balance = await session.getEthBalance(senderAddress);
    if (balance == null || balance.isLessThan(transferAmount)) {
      throw new InsufficientBalanceError(
        new BigNumber(0),
        transferAmount,
        "ETH"
      );
    }

    const transaction = await this.buildTransaction(
      privateKey,
      this.gasPriceWei,
      this.gasLimit
    );

    this.transaction = transaction;
    return transaction;
  }

  async send(): Promise<string> {
    const { session } = this.validateConfiguration();
    const { txSent, transaction } = this;
    if (transaction == null) {
      throw new UnsignedTransactionError(`Transaction has not been signed yet`);
    }

    if (txSent) {
      throw new DuplicateOperationError(`Transaction has already been sent`);
    }

    const receipt = await session.sendSignedTransaction(transaction);
    this.txSent = true;
    this.hash = receipt.transactionHash;
    return receipt.transactionHash;
  }

  async buildTransaction(
    privateKey: string,
    gasPriceWei: ?BigNumber,
    gasLimit: ?BigNumber
  ): Promise<EthereumTx> {
    const {
      session,
      toAddress,
      senderAddress,
      transferAmount
    } = this.validateConfiguration();
    const chainId = await session.getChainId();

    let nonce: ?number = this.nonce;
    if (nonce == null) {
      nonce = await session.getNonce(senderAddress);
    }

    if (gasPriceWei == null) {
      gasPriceWei = await session.getGasPriceWei();
    }

    if (gasLimit == null) {
      gasLimit = await session.getLatestGasLimit();
    }

    const transaction = new EthereumTx({
      from: senderAddress,
      // $FlowFixMe
      gasPrice: session.toHex(gasPriceWei),
      // $FlowFixMe
      gasLimit: session.toHex(gasLimit),
      to: toAddress,
      value: session.toHex(Web3Session.toEthPrecision(transferAmount)),
      // $FlowFixMe
      nonce: session.toHex(nonce),
      chainId: session.toHex(chainId)
    });
    transaction.sign(session.toHexBuffer(privateKey));

    return transaction;
  }

  validateConfiguration(): {
    session: Web3Session,
    toAddress: EthAddress,
    senderAddress: EthAddress,
    transferAmount: BigNumber
  } {
    const { session, toAddress, senderAddress, transferAmount } = this;

    if (session == null) {
      throw new MissingConfigError(`missing web3 session`);
    }

    if (toAddress == null) {
      throw new MissingConfigError(`missing toAddress`);
    }

    if (senderAddress == null) {
      throw new MissingConfigError(`missing senderAddress`);
    }

    if (transferAmount == null) {
      throw new MissingConfigError(`missing transferAmount`);
    }

    return {
      session,
      toAddress,
      senderAddress,
      transferAmount
    };
  }
}
