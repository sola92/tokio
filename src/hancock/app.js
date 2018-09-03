//@flow
import "./init-db";
import express from "express";
import type { $Request, $Response } from "express";

import Web3Session from "src/lib/ethereum/Web3Session";
import EthereumAddress from "src/hancock/models/EthereumAddress";

const app = express();

const PORT = 8080;
const HOST = "0.0.0.0";

app.get("/", async (req: $Request, res: $Response) => {
  const session = Web3Session.createRinkebySession();
  const account = session.createAccount(session.randomHex(32));
  const address: EthereumAddress = await EthereumAddress.query().insert({
    address: account.address
  });

  const addr: EthereumAddress = await address.refresh();
  res.send(`Hello world, ${addr.attr.id} ${addr.attr.address}`);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
