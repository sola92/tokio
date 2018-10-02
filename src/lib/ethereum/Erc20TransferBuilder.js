//@flow
import EthereumTx from "ethereumjs-tx";

import type { ContractType, ContractMethodTransaction } from "./typedef";

import { BigNumber } from "bignumber.js";

import Web3Session from "./Web3Session";
import {
  InvalidAddressError,
  DuplicateSendError,
  UnsignedTransactionError,
  InsufficientBalanceError,
  MissingConfigError
} from "./errors";

export default class Erc20TransferBuilder {
  ticker: ?string;
  session: ?Web3Session;
  contract: ?ContractType;
  decimals: ?number;
  senderAddress: ?EthAddress;
  toAddress: ?EthAddress;
  transferAmount: ?BigNumber;
  nonce: ?number;
  gasPriceWei: ?BigNumber;
  gasLimit: ?number;

  hash: ?string;
  transaction: ?EthereumTx;
  txSent: boolean = false;

  setContract(contract: ContractType, decimals: number, ticker: string): this {
    this.contract = contract;
    this.decimals = decimals;
    this.ticker = ticker;
    return this;
  }

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
    this.gasLimit = gasLimit.toNumber();
    return this;
  }

  async build(privateKey: string): Promise<EthereumTx> {
    const {
      contract,
      session,
      ticker,
      decimals,
      toAddress,
      transferAmount
    } = this.validateConfiguration();

    if (this.transaction != null) {
      throw ``;
    }

    if (!session.isAddress(toAddress)) {
      throw new InvalidAddressError(toAddress, ticker);
    }

    const balance = await this.getSenderBalanceInNormalPrecision();
    if (balance.isLessThan(transferAmount)) {
      throw new InsufficientBalanceError(balance, transferAmount, ticker);
    }

    const transaction = await this.buildTransaction(
      contract.methods.transfer(
        toAddress,
        session.toHex(this.toContractPrecision(transferAmount, decimals))
      ),
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
      throw new DuplicateSendError(`Transaction has already been sent`);
    }

    const receipt = await session.sendSignedTransaction(transaction);
    this.txSent = true;
    this.hash = receipt.transactionHash;
    return receipt.transactionHash;
  }

  async getSenderBalanceInNormalPrecision(): Promise<BigNumber> {
    const { contract, decimals } = this.validateContractConfiguration();
    const accountBalance: number = await contract.methods
      .balanceOf(this.senderAddress)
      .call();

    return this.fromContractPrecision(accountBalance, decimals);
  }

  async buildTransaction(
    call: ContractMethodTransaction,
    privateKey: string,
    gasPriceWei: ?BigNumber,
    gasLimit: ?number
  ): Promise<EthereumTx> {
    const { session, contract, senderAddress } = this.validateConfiguration();
    const chainId = await session.getChainId();

    let nonce: ?number = this.nonce;
    if (nonce == null) {
      nonce = await session.getNonce(senderAddress);
    }

    if (gasPriceWei == null) {
      gasPriceWei = await session.getGasPriceWei();
    }

    if (gasLimit == null) {
      gasLimit = await call.estimateGas();
    }

    const transaction = new EthereumTx({
      from: this.senderAddress,
      gasPrice: session.toHex(gasPriceWei),
      gasLimit: session.toHex(gasLimit),
      to: contract.options.address,
      value: "0x0",
      data: call.encodeABI(),
      nonce: session.toHex(nonce),
      chainId: session.toHex(chainId)
    });
    transaction.sign(session.toHexBuffer(privateKey));
    return transaction;
  }

  validateContractConfiguration(): {
    contract: ContractType,
    decimals: number,
    ticker: string
  } {
    const { contract, ticker, decimals } = this;
    if (contract == null || decimals == null || ticker == null) {
      throw new MissingConfigError(`missing contract details`);
    }

    return {
      contract,
      decimals,
      ticker
    };
  }

  validateConfiguration(): {
    contract: ContractType,
    session: Web3Session,
    ticker: string,
    toAddress: EthAddress,
    senderAddress: EthAddress,
    transferAmount: BigNumber,
    decimals: number
  } {
    const { session, toAddress, senderAddress, transferAmount } = this;

    const { contract, decimals, ticker } = this.validateContractConfiguration();

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
      contract,
      session,
      ticker,
      toAddress,
      senderAddress,
      transferAmount,
      decimals
    };
  }

  toContractPrecision(value: BigNumber, decimals: number): BigNumber {
    return new BigNumber(value).times(new BigNumber(10).pow(decimals));
  }

  fromContractPrecision(
    value: BigNumber | number | string,
    decimals: number
  ): BigNumber {
    return new BigNumber(value).times(new BigNumber(10).pow(-1 * decimals));
  }
}
