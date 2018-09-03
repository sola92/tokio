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

  async getBalance(inEthPrecision?: boolean = false): Promise<BigNumber> {
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

  async transferTo(
    toAddress: EthAddress,
    value: BigNumber,
    privateKey: string
  ): Promise<string> {
    const { session } = this;

    if (!session.isAddress(toAddress)) {
      throw new InvalidAddressError(toAddress, EthSession.TICKER);
    }

    const balance = await this.getBalance();
    if (balance.isLessThan(value)) {
      throw new InsufficientBalanceError(balance, value, EthSession.TICKER);
    }

    const gasPrice = await session.getGasPrice();
    const chainId = await session.getChainId();
    const nonce = await session.getNonce(this.fromAddress);

    const lastestBlock = await session.getLatestBlock();

    console.log("gasLimit", lastestBlock.gasLimit);
    console.log("value", EthSession.toEthPrecision(value).toString());
    const transaction = new EthereumTx({
      from: this.fromAddress,
      gasPrice: session.toHex(gasPrice),
      gasLimit: session.toHex(lastestBlock.gasLimit),
      to: toAddress,
      value: session.toHex(EthSession.toEthPrecision(value)),
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
