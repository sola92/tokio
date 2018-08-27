//@flow
import program from "commander";
import {
  ABI,
  contractAddress,
  decimals
} from "../abi/ropsten/test-standard-token";

import Web3Session from "../Web3Session";
import Erc20Session from "../Erc20Session";

require("dotenv").config();

program
  .version("0.0.1")
  .option("--address [value]", "address to issue TST tokens")
  .option("--amount [value]", "quantity of tokens to issue")
  .option(
    "--privateKey [value]",
    "(optional) private key of issuing address. will sign with ropsten test address if empty"
  )
  .parse(process.argv);

const exitWithError = (message: string, code?: number = 1) => {
  console.error(message);
  process.exit(code);
};

const main = async () => {
  const session = Web3Session.createRopstenSession();
  // $FlowFixMe
  const amount: string = program.amount;
  // $FlowFixMe
  const toAddress: string = program.address;

  const senderAccount = await session.privateKeyToAccount(
    process.env.ROPSTEN_ACCOUNT_KEY || ""
  );
  if (senderAccount != null) {
    const balance = await session.getEthBalance(senderAccount.address);
    console.log("sender eth balance", balance.toString());

    const contract = new session.web3.eth.Contract(ABI, contractAddress, {
      // issuer can be recipient here, doesn't matter.
      from: senderAccount.address
    });

    const erc20Session = new Erc20Session({
      session,
      contract,
      ticker: "TST",
      decimals: decimals,
      fromAddress: senderAccount.address
    });

    const txHash = await erc20Session.issueMethodCall(
      contract.methods.showMeTheMoney(
        toAddress,
        session.toHex(erc20Session.toContractPrecision(amount || ""))
      ),
      senderAccount.privateKey
    );
    console.log(`issued ${amount}TST to ${toAddress}`);
    console.log(`ropsten tx hash: ${txHash}`);
  } else {
    exitWithError("invalid issuer address on ropsten");
  }
};

main();
