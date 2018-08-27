/* eslint-disable no-unused-vars */

import EthSession from "./src/ethereum/EthSession";
import Web3Session from "./src/ethereum/Web3Session";
import Erc20Session from "./src/ethereum/Erc20Session";

global.EthSession = EthSession;
global.Web3Session = Web3Session;
global.Erc20Session = Erc20Session;
