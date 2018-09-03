//@flow
import "jest";

import { BigNumber } from "bignumber.js";

import EthSession from "src/lib/ethereum/EthSession";
import Web3Session from "src/lib/ethereum/Web3Session";

require("dotenv").config();

const ROPSTEN_KEY: string = (process.env.ROPSTEN_ACCOUNT_KEY || "").toString();

jest.setTimeout(1000000);

test("send ETH", async () => {
  // const session = Web3Session.createRopstenSession();
  // const sender = await session.privateKeyToAccount(ROPSTEN_KEY);
  // const recipient = await session.createAccount(session.randomHex(32));
  //
  // const amount = new BigNumber("1e-18");
  // expect(sender).not.toBeNull();
  // if (sender != null) {
  //   const senderSession = new EthSession({
  //     session,
  //     fromAddress: sender.address
  //   });
  //
  //   const txHash = await senderSession.transferTo(
  //     recipient.address,
  //     amount,
  //     ROPSTEN_KEY
  //   );
  //
  //   console.log({ txHash });
  //
  //   const recipientSession = new EthSession({
  //     session,
  //     fromAddress: recipient.address
  //   });
  //
  //   const recipientBalance = await recipientSession.getBalance();
  //   expect(recipientBalance.toString()).toBe(amount.toString());
  // }
});
