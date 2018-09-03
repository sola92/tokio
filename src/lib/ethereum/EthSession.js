//@flow
import EthereumTx from "ethereumjs-tx";

import { BigNumber } from "bignumber.js";

import Web3Session from "./Web3Session";
import { InvalidAddressError, InsufficientBalanceError } from "./errors";

export default class EthSession {
  session: Web3Session;
  fromAddress: EthAddress;

  static TICKER: string = "ETH";
  static DECIMALS: number = 18;

  constructor({
    session,
    fromAddress
  }: {
    session: Web3Session,
    fromAddress: EthAddress
  }) {
    this.session = session;
    this.fromAddress = fromAddress;

    if (!session.isAddress(fromAddress)) {
      throw new InvalidAddressError(fromAddress, EthSession.TICKER);
    }
  }

  async getBalance(
    { inEthPrecision }: { inEthPrecision?: boolean } = { inEthPrecision: false }
  ): Promise<BigNumber> {
    const accountBalance: ?BigNumber = await this.session.getEthBalance(
      this.fromAddress
    );

    if (accountBalance != null) {
      if (inEthPrecision) {
        return accountBalance;
      }
      return EthSession.fromEthPrecision(accountBalance);
    }

    return new BigNumber(0);
  }

  async transferTo({
    value,
    nonce,
    gasLimit,
    gasPrice,
    toAddress,
    privateKey
  }: {
    value: BigNumber,
    toAddress: EthAddress,
    privateKey: string,
    nonce?: number,
    gasPrice?: BigNumber,
    gasLimit?: BigNumber
  }): Promise<string> {
    const { session } = this;

    if (!session.isAddress(toAddress)) {
      throw new InvalidAddressError(toAddress, EthSession.TICKER);
    }

    const balance = await this.getBalance();
    if (balance.isLessThan(value)) {
      throw new InsufficientBalanceError(balance, value, EthSession.TICKER);
    }

    if (gasPrice === null) {
      gasPrice = await session.getGasPrice();
    }

    if (gasLimit === null) {
      const lastestBlock = await session.getLatestBlock();
      gasLimit = new BigNumber(lastestBlock.gasLimit);
    }
    const chainId = await session.getChainId();

    if (nonce !== null) {
      nonce = await session.getNonce(this.fromAddress);
    }

    console.log("value", EthSession.toEthPrecision(value).toString());
    const transaction = new EthereumTx({
      from: this.fromAddress,
      // $FlowFixMe
      gasPrice: session.toHex(gasPrice),
      // $FlowFixMe
      gasLimit: session.toHex(gasLimit),
      to: toAddress,
      value: session.toHex(EthSession.toEthPrecision(value)),
      // $FlowFixMe
      nonce: session.toHex(nonce),
      chainId: session.toHex(chainId)
    });
    transaction.sign(session.toHexBuffer(privateKey));

    const receipt = await session.sendSignedTransaction(transaction);
    return receipt.transactionHash;
  }

  static toEthPrecision(value: BigNumber | number | string): BigNumber {
    return new BigNumber(value).times(
      new BigNumber(10).pow(EthSession.DECIMALS)
    );
  }

  static fromEthPrecision(value: BigNumber | number | string): BigNumber {
    return new BigNumber(value).times(
      new BigNumber(10).pow(-1 * EthSession.DECIMALS)
    );
  }
}
