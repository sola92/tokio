//@flow
import "jest";

import {
  ABI,
  decimals,
  contractAddress
} from "../abi/ropsten/test-standard-token";

import { BigNumber } from "bignumber.js";

import Web3Session from "../Web3Session";
import Erc20Session from "../Erc20Session";
import { InsufficientBalanceError } from "../errors";

require("dotenv").config();

const ROPSTEN_KEY: string = (process.env.ROPSTEN_ACCOUNT_KEY || "").toString();

jest.setTimeout(1000000);

test("send erc20 (TST token)", async () => {
  // const session = Web3Session.createRopstenSession();
  // const sender = await session.privateKeyToAccount(ROPSTEN_KEY);
  // const recipient = await session.createAccount(session.randomHex(32));
  //
  // const amount = new BigNumber("0.00001");
  // expect(sender).not.toBeNull();
  // if (sender != null) {
  //   const contract = new session.web3.eth.Contract(ABI, contractAddress, {
  //     from: sender.address
  //   });
  //
  //   const senderSession = new Erc20Session({
  //     session,
  //     contract,
  //     ticker: "TST",
  //     decimals: decimals,
  //     fromAddress: sender.address
  //   });
  //
  //   const txHash = await senderSession.transferTo(
  //     recipient.address,
  //     amount,
  //     ROPSTEN_KEY
  //   );
  //
  //   expect(txHash).not.toBeNull();
  //
  //   const recipientSession = new Erc20Session({
  //     session,
  //     contract,
  //     ticker: "TST",
  //     decimals: decimals,
  //     fromAddress: recipient.address
  //   });
  //
  //   const recipientBalance = await recipientSession.getBalance();
  //   expect(recipientBalance.toString()).toBe(amount.toString());
  // }
});

test("send erc20 (TST token) with insufficient balance", async () => {
  const session = Web3Session.createRopstenSession();
  const sender = await session.privateKeyToAccount(ROPSTEN_KEY);
  const recipient = await session.createAccount(session.randomHex(32));

  expect(sender).not.toBeNull();
  if (sender != null) {
    const contract = new session.web3.eth.Contract(ABI, contractAddress, {
      from: sender.address
    });

    const senderSession = new Erc20Session({
      session,
      contract,
      ticker: "TST",
      decimals: decimals,
      fromAddress: sender.address
    });

    const balance = await senderSession.getBalance();

    let error: ?InsufficientBalanceError = null;
    try {
      await senderSession.transferTo(
        recipient.address,
        balance.plus(1),
        ROPSTEN_KEY
      );
    } catch (e) {
      error = e;
    }

    expect(error).not.toBeNull();
    if (error != null) {
      expect(error.ticker).toBe("TST");
      expect(error.balance.isLessThan(error.required)).toBeTruthy();
    }

    const recipientSession = new Erc20Session({
      session,
      contract,
      ticker: "TST",
      decimals: decimals,
      fromAddress: recipient.address
    });

    const recipientBalance = await recipientSession.getBalance();
    expect(recipientBalance.isZero()).toBeTruthy();
  }
});
