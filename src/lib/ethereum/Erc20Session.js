//@flow
import EthereumTx from "ethereumjs-tx";

import type { ContractType, ContractMethodTransaction } from "./typedef";

import { BigNumber } from "bignumber.js";

import Web3Session from "./Web3Session";
import { InvalidAddressError, InsufficientBalanceError } from "./errors";

export default class Erc20Session {
  ticker: string;
  session: Web3Session;
  contract: ContractType;
  decimals: number;
  fromAddress: EthAddress;

  constructor({
    contract,
    fromAddress,
    session,
    decimals,
    ticker
  }: {
    contract: ContractType,
    fromAddress: EthAddress,
    session: Web3Session,
    decimals: number,
    ticker: string
  }) {
    this.ticker = ticker;
    this.session = session;
    this.contract = contract;
    this.decimals = decimals;
    this.fromAddress = fromAddress;
  }

  async getBalance(
    { inContractPrecision }: { inContractPrecision?: boolean } = {
      inContractPrecision: false
    }
  ): Promise<BigNumber> {
    const accountBalance: number = await this.contract.methods
      .balanceOf(this.fromAddress)
      .call();

    if (inContractPrecision) {
      return new BigNumber(accountBalance);
    }

    return this.fromContractPrecision(accountBalance);
  }

  async transferTo({
    nonce,
    gasPrice,
    toAddress,
    privateKey,
    transferAmount
  }: {
    toAddress: EthAddress,
    privateKey: string,
    transferAmount: BigNumber,
    nonce?: number,
    gasPrice?: BigNumber
  }): Promise<string> {
    const { contract, session, ticker } = this;

    if (!session.isAddress(toAddress)) {
      throw new InvalidAddressError(toAddress, ticker);
    }

    const balance = await this.getBalance();
    if (balance.isLessThan(transferAmount)) {
      throw new InsufficientBalanceError(balance, transferAmount, ticker);
    }

    return this.issueMethodCall(
      contract.methods.transfer(
        toAddress,
        session.toHex(this.toContractPrecision(transferAmount))
      ),
      privateKey,
      nonce,
      gasPrice
    );
  }

  async issueMethodCall(
    call: ContractMethodTransaction,
    privateKey: string,
    nonce?: number,
    gasPrice?: BigNumber
  ): Promise<string> {
    const { session, contract, fromAddress } = this;
    const chainId = await session.getChainId();

    if (nonce == null) {
      nonce = await session.getNonce(fromAddress);
    }

    const estimatedGas = await call.estimateGas();
    if (gasPrice == null) {
      gasPrice = await session.getGasPrice();
    }

    const transaction = new EthereumTx({
      from: this.fromAddress,
      gasPrice: session.toHex(gasPrice),
      gasLimit: session.toHex(estimatedGas),
      to: contract.options.address,
      value: "0x0",
      data: call.encodeABI(),
      nonce: session.toHex(nonce),
      chainId: session.toHex(chainId)
    });
    transaction.sign(session.toHexBuffer(privateKey));

    const receipt = await session.sendSignedTransaction(transaction);
    return receipt.transactionHash;
  }

  toContractPrecision(value: BigNumber | number | string): BigNumber {
    const { decimals } = this;
    return new BigNumber(value).times(new BigNumber(10).pow(decimals));
  }

  fromContractPrecision(value: BigNumber | number | string): BigNumber {
    const { decimals } = this;
    return new BigNumber(value).times(new BigNumber(10).pow(-1 * decimals));
  }
}
