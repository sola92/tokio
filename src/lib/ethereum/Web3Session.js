//@flow
import Web3 from "web3";

import EthereumTx from "ethereumjs-tx";

import type {
  Web3ApiType,
  Account,
  Block,
  EthUnit,
  NetworkType,
  RawTransaction,
  TransactionReceipt
} from "./typedef";

import { BigNumber } from "bignumber.js";

const RINKEBY_NODE =
  "https://rinkeby.infura.io/v3/cf8f6c0480204e3c812c02884c379731";

const MAINNET_NODE =
  "https://mainnet.infura.io/v3/df6899cc9e5a4810ad24129e72c2f7bd";

const ROPSTEN_NODE =
  "https://ropsten.infura.io/v3/fdc23aa441204f8c92c9bc609e19c01c";

export default class Web3Session {
  web3: Web3ApiType;
  static ETH_DECIMALS: number = 18;
  static ONE_WEI: BigNumber = new BigNumber("1e-18");
  static ONE_GWEI: BigNumber = new BigNumber("1e-9");
  static AVG_BLOCK_TIME_SECS = 14;

  constructor(nodeEndpoint: string) {
    this.web3 = new Web3(new Web3.providers.HttpProvider(nodeEndpoint));
  }

  createAccount(entropy: string) {
    return this.web3.eth.accounts.create([entropy]);
  }

  privateKeyToAccount(privateKey: string): ?Account {
    try {
      return this.web3.eth.accounts.privateKeyToAccount(privateKey);
    } catch (e) {
      // invalid private key
    }
    return null;
  }

  toHex(value: string | number | BigNumber): string {
    return this.web3.utils.toHex(value);
  }

  toHexBuffer(value: string | Buffer): Buffer {
    if (typeof value === "string") {
      if (value.startsWith("0x")) {
        return new Buffer(value.substring(2), "hex");
      }
    }

    return Buffer.from(value);
  }

  isAddress(str: string): boolean {
    return this.web3.utils.isAddress(str);
  }

  randomHex(size: number): string {
    return this.web3.utils.randomHex(size);
  }

  toWei(number: string | number, unit: EthUnit): BigNumber {
    return new BigNumber(this.web3.utils.toWei(number, unit));
  }

  fromWei(number: string | BigNumber, unit: EthUnit): BigNumber {
    return new BigNumber(this.web3.utils.fromWei(number.toString(), unit));
  }

  weiToEther(number: string | BigNumber): BigNumber {
    return new BigNumber(this.web3.utils.fromWei(number.toString(), "ether"));
  }

  clearWallet() {
    return this.web3.eth.accounts.wallet.clear();
  }

  async getGasPriceWei(unit: EthUnit = "wei"): Promise<BigNumber> {
    const price = await this.web3.eth.getGasPrice();
    return new BigNumber(price);
  }

  async getEthBalance(address: EthAddress): Promise<?BigNumber> {
    let balanceStr: ?string = null;
    try {
      balanceStr = await this.web3.eth.getBalance(address);
    } catch (e) {
      // invalid address
    }

    return balanceStr != null ? new BigNumber(balanceStr) : null;
  }

  async getBlockNumber(): Promise<number> {
    return await this.web3.eth.getBlockNumber();
  }

  async getLatestGasLimit(): Promise<BigNumber> {
    const lastestBlock = await this.getLatestBlock();
    return new BigNumber(lastestBlock.gasLimit);
  }

  async signTransaction(
    transaction: RawTransaction,
    privateKey: string
  ): Promise<string> {
    return await this.web3.eth.signTransaction(transaction, privateKey);
  }

  async getLatestBlock(
    returnTransactionObjects?: boolean = true
  ): Promise<Block> {
    return this.web3.eth.getBlock("latest", returnTransactionObjects);
  }

  async getNetworkType(): Promise<NetworkType> {
    return await this.web3.eth.net.getNetworkType();
  }

  async isListening(): Promise<boolean> {
    return await this.web3.eth.net.isListening();
  }

  async getTransaction(hash: string): ?RawTransaction {
    let transaction: ?RawTransaction = null;
    try {
      transaction = await this.web3.eth.getTransaction(hash);
    } catch (e) {
      // transaction not found
    }

    return transaction;
  }

  async getTransactionCount(address: EthAddress): Promise<number> {
    return await this.web3.eth.getTransactionCount(address);
  }

  async getBlockConfirmations(hash: string): Promise<?number> {
    const transaction = await this.getTransaction(hash);
    if (transaction != null) {
      const blockNumber = transaction.blockNumber;
      if (blockNumber != null) {
        const currentBlockNumber = await this.getBlockNumber();
        return currentBlockNumber - blockNumber;
      }
    }

    return null;
  }

  async sendSignedTransaction(
    transaction: EthereumTx
  ): Promise<TransactionReceipt> {
    const transactionHash = "0x" + transaction.serialize().toString("hex");
    return await this.web3.eth.sendSignedTransaction(transactionHash);
  }

  createContractInstance(abi, contractAddress: EthAddress, options) {
    return new this.web3.eth.Contract(abi, contractAddress, options);
  }

  async getPeerCount(): Promise<number> {
    return await this.web3.eth.net.getPeerCount();
  }

  async getNonce(address: EthAddress): Promise<number> {
    return this.getTransactionCount(address);
  }

  async isMainnet(): Promise<boolean> {
    const type = await this.getNetworkType();
    return type === "main";
  }

  async getChainId(): Promise<number> {
    return await this.web3.eth.net.getId();
  }

  static createRinkebySession(): Web3Session {
    return new Web3Session(RINKEBY_NODE);
  }

  static createRopstenSession(): Web3Session {
    return new Web3Session(ROPSTEN_NODE);
  }

  static createMainnetSession(): Web3Session {
    return new Web3Session(MAINNET_NODE);
  }

  static createSession(): Web3Session {
    if (process.env.NODE_ENV == "production") {
      return this.createMainnetSession();
    } else {
      return this.createRopstenSession();
    }
  }

  static toEthPrecision(value: BigNumber | number | string): BigNumber {
    return new BigNumber(value).times(
      new BigNumber(10).pow(Web3Session.ETH_DECIMALS)
    );
  }

  static fromEthPrecision(value: BigNumber | number | string): BigNumber {
    return new BigNumber(value).times(
      new BigNumber(10).pow(-1 * Web3Session.ETH_DECIMALS)
    );
  }
}
