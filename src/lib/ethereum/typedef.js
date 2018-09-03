//@flow
import { BN } from "bn.js";
import { BigNumber } from "bignumber.js";

type Callback<R> = (error: ?mixed, result: ?R) => void;

type PromiEvent<T, EventEnum> = Promise<T> & {
  on(event: EventEnum, handler: (mixed) => void): PromiEvent<T, EventEnum>,
  once(event: EventEnum, handler: (mixed) => void): PromiEvent<T, EventEnum>
};

export type GasPrice = string | number | BigNumber;
export type TransactionValue = string | number | BN | BigNumber;

export type Account = {
  address: EthAddress,
  privateKey: string,
  sign: (data: mixed) => mixed,
  encrypt: (passord: mixed) => mixed,
  signTransaction: (tx: RawTransaction) => SignatureObject
};
export type ContractMethodTransaction = {
  // The arguments passed to the method before. They can be changed.
  arguments: Array<any>,

  // Will call the “constant” method and execute its smart contract method in
  // the EVM without sending a transaction (Can’t alter the smart
  // contract state).
  call: <T>(
    options?: {
      // The address the call “transaction” should be made from
      from?: ?EthAddress,
      // The gas price in wei to use for this call “transaction”.
      gasPrice?: ?string,
      // The maximum gas provided for this call “transaction” (gas limit).
      gas?: ?number
    },
    callback?: Callback<mixed>
  ) => Promise<T>,

  // Will send a transaction to the smart contract and execute
  // its method (Can alter the smart contract state).
  send: (
    options: {
      // The address the transaction should be sent from
      from: ?EthAddress,
      // The gas price in wei to use for this transaction
      gasPrice?: ?string,
      // The maximum gas provided for this transaction (gas limit).
      gas?: ?number,
      // The maximum gas provided for this transaction (gas limit).
      value?: ?TransactionValue
    },
    // This callback will be fired first with the “transactionHash”,
    // or with an error object as the first argument.
    callback?: Callback<string>
  ) => PromiEvent<
    string,
    "transactionHash" | "receipt" | "confirmation" | "error"
  >,

  // Will call estimate the gas a method execution will take when executed in
  // the EVM without. The estimation can differ from the actual gas used when
  // later sending a transaction, as the state of the smart contract can be
  // different at that time.
  estimateGas: (
    options?: {
      // The address the transaction should be sent from
      from: ?EthAddress,
      // The maximum gas provided for this transaction (gas limit).
      gas?: ?number,
      // The maximum gas provided for this transaction (gas limit).
      value?: ?TransactionValue
    },
    // This callback will be fired first with the “transactionHash”,
    // or with an error object as the first argument.
    callback?: Callback<number>
  ) => Promise<number>,

  // Encodes the ABI for this method. This can be used to send a transaction,
  // call a method, or pass it into another smart contracts method as
  // arguments.
  encodeABI: () => string
};

export type ContractAbi = { [string | number]: any } | Array<{ [string]: any }>;

declare class Contract {
  options: {
    // The address where the contract is deployed. See options.address.
    address: EthAddress,
    // The json interface of the contract. See options.jsonInterface.
    jsonInterface: ContractAbi,
    // The byte code of the contract. Used when the contract gets deployed.
    data: string,
    // The address transactions should be made from.
    from: EthAddress,
    // The gas price in wei to use for transactions
    gasPrice: string,
    // The maximum gas provided for a transaction (gas limit)
    gas: number
  };

  constructor(
    // The json interface for the contract to instantiate
    jsonInterface: ContractAbi,
    // The address of the smart contract to call, can be added later using
    address?: EthAddress,
    // The options of the contract. Some are used as fallbacks for calls
    // and transactions:
    options?: {
      // The address transactions should be made from.
      from?: EthAddress,
      // The gas price in wei to use for transactions.
      gasPrice?: string,
      // The maximum gas provided for a transaction (gas limit).
      gas?: number,
      // The byte code of the contract. Used when the contract gets deployed.
      data?: string
    }
  ): Contract;

  // Clones the current contract instance.
  clone(): Contract;

  // Call this function to deploy the contract to the blockchain.
  // After successful deployment the promise will resolve with a new contract
  // instance.
  deploy({
    // The byte code of the contract.
    data: string,
    // The arguments which get passed to the constructor on deployment.
    arguments?: Array<any>
  }): Contract;

  methods: { [string]: (...args: Array<any>) => ContractMethodTransaction };
}

export type ContractType = Contract;

export type RawTransaction = {
  nonce?: ?(string | number),
  chainId?: ?(string | number),
  to?: ?EthAddress,
  data?: ?string,
  value?: ?TransactionValue,
  gasPrice?: ?GasPrice,
  gas?: ?number,
  blockHash?: ?string,
  blockNumber?: number,
  hash?: ?string,
  input?: ?string,
  r?: ?string,
  s?: ?string,
  transactionIndex?: number,
  v?: ?string
};

export type SignatureObject = {
  messageHash: string,
  r: string,
  s: string,
  v: string,
  rawTransaction: string
};

export type TransactionReceipt = {
  // Boolean: TRUE if the transaction was successful, FALSE, if the
  // EVM reverted the transaction.
  status: boolean,
  // 32 Bytes - String: Hash of the block where this transaction was in.
  blockHash: string,
  // Block number where this transaction was in.
  blockNumber: number,
  // Hash of the transaction
  transactionHash: string,
  // Integer of the transactions index position in the block
  transactionIndex: string,
  // Address of the sender
  from: EthAddress,
  // Address of the sender
  to: EthAddress,
  // The contract address created, if the transaction was a
  // contract creation, otherwise null
  contractAddress?: EthAddress,
  // The total amount of gas used when this transaction was executed
  // in the block
  cumulativeGasUsed: number,
  // The amount of gas used by this specific transaction alone
  gasUsed: number,
  // Array of log objects, which this transaction generated.
  logs: Array<mixed>,
  events?: Array<mixed>
};

export type KeyStoreJSONV3 = {
  version: number,
  id: string,
  address: EthAddress,
  crypto: {
    ciphertext: string,
    cipherparams: { [string]: any } /* { iv: string } */,
    cipher: string,
    kdf: string,
    kdfparams: { [string]: any },
    /* {
      dklen: number,
      salt: string,
      n: number,
      r: number,
      p: number
    } */ mac: string
  }
};

export type Wallet = {
  [address: EthAddress]: Account,
  add: (privateKeyOrAccount: string | Account) => Account,
  clear: () => Wallet,
  remove: (addressOrIndex: string | number) => boolean,
  create: (numberOfAccounts: number, entropy?: ?string) => Wallet,
  encrypt: (password: string) => Array<KeyStoreJSONV3>,
  decrypt: (keystoreArray: Array<KeyStoreJSONV3>, password: string) => Wallet
};

export type Accounts = {
  create: (entropy: Array<string>) => Account,
  privateKeyToAccount: (privateKey: string) => Account,
  signTransaction: (
    transaction: RawTransaction,
    privateKey: string,
    callback?: ?Callback<string | SignatureObject>
  ) => Promise<string | SignatureObject>,
  recoverTransaction: (signature: string) => string,
  hashMessage: (message: string) => string,
  sign: (data: string, privateKey: string) => string | SignatureObject,
  recover: SignatureObject => string,
  encrypt: (privateKey: string, password: string) => KeyStoreJSONV3,
  decrypt: (encryptedPrivateKey: KeyStoreJSONV3, password: string) => Account,
  wallet: Wallet
};

export type SignedTransaction = {
  raw: string,
  tx: RawTransaction
};

export type Block = {
  // The block number. null when its pending block.
  number: number,
  // Hash of the block. null when its pending block.
  hash: string,
  // Hash of the parent block.
  parentHash: string,
  // Hash of the generated proof-of-work. null when its pending block.
  nonce: string,
  // 32 Bytes - String: SHA3 of the uncles data in the block.
  sha3Uncles: string,
  // 256 Bytes - String: The bloom filter for the logs of the block. null
  // when its pending block.
  logsBloom: string,
  // 32 Bytes - String: The root of the transaction trie of the block
  transactionsRoot: string,
  // 32 Bytes - String: The root of the final state trie of the block.
  stateRoot: string,
  // String: The address of the beneficiary to whom the mining rewards
  // were given
  miner: string,
  // String: Integer of the difficulty for this block.
  difficulty: string,
  // String: Integer of the total difficulty of the chain until this block.
  totalDifficulty: string,
  // String: The “extra data” field of this block.
  extraData: string,
  // Number: Integer the size of this block in bytes
  size: number,
  // Number: The maximum gas allowed in this block
  gasLimit: number,
  // Number: The total used gas by all transactions in this block.
  gasUsed: number,
  // Number: The unix timestamp for when the block was collated.
  timestamp: number,
  // Array of transaction objects, or 32 Bytes transaction hashes depending
  // on the returnTransactionObjects parameter.
  transactions: Array<string | RawTransaction>,
  // Array: Array of uncle hashes.
  uncles: Array<string>
};

export type NetworkType = "main" | "morden" | "ropsten" | "rinkeby" | "private";

export type Net = {
  getId: (callback?: Callback<number>) => Promise<number>,
  isListening: (callback?: Callback<boolean>) => Promise<boolean>,
  getPeerCount: (callback?: Callback<number>) => Promise<number>,
  getNetworkType: (callback?: Callback<NetworkType>) => Promise<NetworkType>
};

export type Eth = {
  net: Net,
  accounts: Accounts,
  Contract: Class<Contract>,
  getTransaction: (
    transactionHash: string,
    callback?: Callback<RawTransaction>
  ) => Promise<RawTransaction>,
  getTransactionCount: (
    address: EthAddress,
    defaultBlock?: string | number,
    callback?: Callback<number>
  ) => Promise<number>,
  sendTransaction: (
    transaction: RawTransaction,
    callback?: Callback<TransactionReceipt>
  ) => PromiEvent<
    TransactionReceipt,
    "transactionHash" | "receipt" | "confirmation" | "error"
  >,
  sendSignedTransaction: (
    signatureInHexFormat: string,
    callback?: Callback<TransactionReceipt>
  ) => PromiEvent<
    TransactionReceipt,
    "transactionHash" | "receipt" | "confirmation" | "error"
  >,
  sign: (
    data: string,
    address: EthAddress | number,
    Callback<string>
  ) => Promise<string>,
  signTransaction: (
    transaction: RawTransaction,
    address: EthAddress,
    callback?: Callback<SignedTransaction>
  ) => Promise<SignedTransaction>,
  getGasPrice: (callback?: Callback<string>) => Promise<string>,
  getAccounts: (callback?: Callback<Array<string>>) => Promise<Array<string>>,
  getBlockNumber: (callback?: Callback<number>) => Promise<number>,
  getBalance: (
    address: string,
    defaultBlock?: string | number,
    callback?: Callback<string>
  ) => Promise<string>,
  getStorageAt: (
    address: EthAddress,
    index: string | number,
    defaultBlock?: string | number,
    callback?: Callback<string>
  ) => Promise<string>,
  getBlock: (
    blockNumberOrHash: string | number | "latest" /* gived latest block */,
    returnTransactionObjects?: boolean,
    callback?: Callback<Block>
  ) => Promise<Block>
};

export type Utils = {
  toHex: (value: string | number | BigNumber) => string,
  isAddress: (str: any) => boolean,
  utf8ToHex: (str: string) => string,
  randomHex: (size: number) => string
};

export type Web3ApiType = {
  eth: Eth,
  utils: Utils
};
