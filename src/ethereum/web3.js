//@flow
import Web3 from "web3";
import EthereumTx from "ethereumjs-tx";

import { ABI, contractAddress } from "./abi/ropsten/showmethemoney";

import type {
  Web3ApiType,
  Account,
  Block,
  ContractType,
  NetworkType,
  RawTransaction
} from "./web3/typedef";

import { BigNumber } from "bignumber.js";

const RINKEBY_NODE =
  "https://rinkeby.infura.io/v3/cf8f6c0480204e3c812c02884c379731";

const MAINNET_NODE =
  "https://mainnet.infura.io/v3/df6899cc9e5a4810ad24129e72c2f7bd";

const ROPSTEN_NODE =
  "https://ropsten.infura.io/v3/fdc23aa441204f8c92c9bc609e19c01c";

class Web3Session {
  web3: Web3ApiType;

  constructor(nodeEndpoint: string) {
    this.web3 = new Web3(new Web3.providers.HttpProvider(nodeEndpoint));
  }

  createAccount(entropy: string) {
    return this.web3.eth.accounts.create([entropy]);
  }

  privateKeyToAccount(privateKey: string): Account {
    return this.web3.eth.accounts.privateKeyToAccount(privateKey);
  }

  toHex(value: string | number | BigNumber): string {
    return this.web3.utils.toHex(value);
  }

  toHexBuffer(value: string): Buffer {
    if (value.startsWith("0x")) {
      return new Buffer(value.substring(2), "hex");
    }
    return Buffer.from(value);
  }

  isAddress(str: string): boolean {
    return this.web3.utils.isAddress(str);
  }

  randomHex(size: number): string {
    return this.web3.utils.randomHex(size);
  }

  async getGasPrice(): Promise<string> {
    return await this.web3.eth.getGasPrice();
  }

  async getEthBalance(address: string): Promise<BigNumber> {
    const balanceStr = await this.web3.eth.getBalance(address);
    return new BigNumber(balanceStr);
  }

  async getBlockNumber(): Promise<number> {
    return await this.web3.eth.getBlockNumber();
  }

  async signTransaction(
    transaction: RawTransaction,
    privateKey: string
  ): Promise<string> {
    return await this.web3.eth.signTransaction(transaction, privateKey);
  }

  async getLatestBlock(): Promise<Block> {
    const blockNumber = await this.web3.eth.getBlockNumber();
    return this.web3.eth.getBlock(blockNumber, true);
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

  async getTransactionCount(address: string): Promise<number> {
    return await this.web3.eth.getTransactionCount(address);
  }

  async getBlockConfirmations(hash: string): Promise<?number> {
    const transaction = await this.web3.eth.getTransaction(hash);
    if (transaction != null) {
      const blockNumber = transaction.blockNumber;
      if (blockNumber != null) {
        const currentBlockNumber = await this.getBlockNumber();
        return currentBlockNumber - blockNumber;
      }
    }

    return null;
  }

  async getPeerCount(): Promise<number> {
    return await this.web3.eth.net.getPeerCount();
  }

  async isMainnet(): Promise<boolean> {
    return this.getNetworkType() === "main";
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
}

class ER20Session {
  ticker: string;
  session: Web3Session;
  contract: ContractType;
  fromAddress: string;

  constructor({
    contract,
    fromAddress,
    session,
    ticker
  }: {
    contract: ContractType,
    fromAddress: string,
    session: Web3Session,
    ticker: string
  }) {
    this.ticker = ticker;
    this.session = session;
    this.contract = contract;
    this.fromAddress = fromAddress;
  }

  async transferTo(
    toAddress: string,
    value: BigNumber,
    privateKey: string
  ): Promise<string> {
    const { contract, session, ticker } = this;

    if (!session.isAddress(toAddress)) {
      throw `invalid address: ${toAddress}`;
    }
    const gasPrice = await session.getGasPrice();
    const transferAmount = session.toHex(value);

    const balance = await this.getBalance();
    if (balance.isLessThan(value)) {
      throw `insuffient balance: ${balance.toNumber()}${ticker}, ` +
        `sending: ${value.toNumber()}${ticker}`;
    }

    const nonce = await session.getTransactionCount(toAddress);

    // const gas = await contract.methods
    //   .transfer(toAddress, transferAmount)
    //   .estimateGas();
    // console.log({ gas });

    const transaction = new EthereumTx({
      from: this.fromAddress,
      gasPrice: session.toHex(gasPrice),
      gasLimit: session.toHex(210000),
      to: contract.options.address,
      value: "0x0",
      data: contract.methods.transfer(toAddress, transferAmount).encodeABI(),
      nonce: session.toHex(nonce),
      chainId: 0x03
    });
    transaction.sign(session.toHexBuffer(privateKey));

    const transactionHash = "0x" + transaction.serialize().toString("hex");

    const receipt = await session.web3.eth.sendSignedTransaction(
      transactionHash
    );

    return receipt.transactionHash;
  }

  async getBalance(): Promise<BigNumber> {
    const accountBalance: number = await this.contract.methods
      .balanceOf(this.fromAddress)
      .call();

    return new BigNumber(accountBalance);
  }
}

const main = async () => {
  const session = Web3Session.createMainnetSession();
  const sender = await session.createAccount(session.randomHex(32));
  const balance = await session.getEthBalance(sender.address);
  console.log({ ethBalance: balance.toNumber() });

  const blockNumber = await session.getBlockNumber();
  console.log({ blockNumber });

  const contract = new session.web3.eth.Contract(ABI, contractAddress, {
    from: sender.address
  });

  const linkSession = new ER20Session({
    session,
    contract,
    ticker: "LINK",
    fromAddress: sender.address
  });

  const recipientAccount = await session.createAccount(session.randomHex(32));

  const txHash = await linkSession.transferTo(
    recipientAccount.address,
    new BigNumber(2),
    sender.privateKey
  );

  console.log({ txHash });
};

main();
