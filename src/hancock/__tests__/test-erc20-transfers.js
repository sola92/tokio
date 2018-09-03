//@flow
import "jest";
import "./base";

import { BigNumber } from "bignumber.js";

import Web3Session from "src/lib/ethereum/Web3Session";
import Erc20Session from "src/lib/ethereum/Erc20Session";
import { InsufficientBalanceError } from "src/lib/ethereum/errors";

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
