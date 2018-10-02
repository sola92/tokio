//@flow
import "jest";

import {
  ABI,
  decimals,
  contractAddress
} from "../abi/ropsten/test-standard-token";

import Web3Session from "../Web3Session";
import Erc20TransferBuilder from "../Erc20TransferBuilder";
import { InsufficientBalanceError } from "../errors";

require("dotenv").config();

const ROPSTEN_KEY: string = (process.env.ROPSTEN_ACCOUNT_KEY || "").toString();

jest.setTimeout(1000000);

test("send erc20 (TST token) with insufficient balance", async () => {
  const session = Web3Session.createRopstenSession();
  const sender = await session.privateKeyToAccount(ROPSTEN_KEY);
  const recipient = await session.createAccount(session.randomHex(32));

  expect(sender).not.toBeNull();
  if (sender != null) {
    const contract = new session.web3.eth.Contract(ABI, contractAddress, {
      from: sender.address
    });

    const transfer = new Erc20TransferBuilder()
      .setSession(session)
      .setContract(contract, decimals, "TST")
      .setSenderAddress(sender.address)
      .setToAddress(recipient.address);

    const balance = await transfer.getSenderBalanceInNormalPrecision();
    transfer.setTransferAmount(balance.plus(1));

    let error: ?InsufficientBalanceError = null;
    try {
      await transfer.build(ROPSTEN_KEY);
    } catch (e) {
      error = e;
    }

    expect(error).not.toBeNull();
    if (error != null) {
      expect(error.ticker).toBe("TST");
      expect(error.balance.isLessThan(error.required)).toBeTruthy();
    }
  }
});
