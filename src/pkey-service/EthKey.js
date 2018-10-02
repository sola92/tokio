//@flow
import fs from "fs";
import { soliditySha3 } from "web3-utils";
import EthereumTx from "ethereumjs-tx";
import {
  hashPersonalMessage,
  bufferToHex,
  toBuffer,
  ecsign
} from "ethereumjs-util";
import { mapValues } from "lodash";

type Signature = {
  v: /* number in rnage [27, 28] */ number,
  r: /* hex string */ string,
  s: /* hex string */ string
};

/*
* Class that signs stuff.
* Eventually, this should be something that interfaces with an external service to sign data and txs.
* Currently reads from local file to get the private key.
*/
export default class EthKey {
  pkey: Buffer;

  constructor() {
    let pkeyText = fs
      .readFileSync("./src/pkey-service/raw-hex-pkey.txt")
      .toString()
      .trim();
    this.pkey = Buffer.from(pkeyText, "hex");
  }

  sign(rawSha3: string): Signature {
    const salted: string = hashPersonalMessage(toBuffer(rawSha3));
    const signature: Signature = mapValues(
      ecsign(salted, this.pkey),
      (value, key) => (key === "v" ? value : bufferToHex(value))
    );
    return signature;
  }

  signTransaction(tx: EthereumTx) {
    tx.sign(this.pkey);
  }
}
