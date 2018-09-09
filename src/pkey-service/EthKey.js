//@flow
import fs from "fs";
import { soliditySha3 } from "web3-utils";
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
}

function demo() {
  let ethKey = new EthKey();
}
demo();
