import IdexClient from "./IdexClient";
import { getOrdersForAmount, getOrderBook, getOpenOrders } from "./IdexApi";
const util = require("util");

async function postABuyOrder() {
  let a = new IdexClient("0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499");
  try {
    let b = await a.postBuyOrder("LINK", "0.00000029", "517242");
    console.log(b.data);
  } catch (error) {
    console.log("error: " + error.response.data.error);
  }
}
//postABuyOrder();

async function printLinkAsks() {
  try {
    let b = await getOrderBook("LINK", "buy");
    console.log(JSON.stringify(b));
  } catch (error) {
    //console.log("error: " + error.response.data.error);
    console.log("error: " + util.inspect(error));
  }
}
//printLinkAsks();

async function printOpenOrders() {
  let a = new IdexClient("0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499");
  try {
    //  let b = await getOrdersForAmount(10, "LINK", "buy");
    let b = await getOrderBook("LINK", "buy");
    console.log(JSON.stringify(b));
  } catch (error) {
    //console.log("error: " + error.response.data.error);
    console.log("error: " + util.inspect(error));
  }
}
//printOpenOrders();

async function buy1Link() {
  let a = new IdexClient("0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499");
  try {
    let b = await a.buyToken("LINK", 1000, "0.00000029", "0.00000029");
    console.log(b.data);
  } catch (error) {
    //console.log("error: " + error.response.data.error);
    console.log("error: " + util.inspect(error));
  }
}
//buy1Link();

async function withdrawEth() {
  let a = new IdexClient("0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499");
  try {
    let b = await a.withdrawToken("ETH", "0.04");
    console.log("withdraw Response: " + b.data);
  } catch (error) {
    //console.log("error: " + error.response.data.error);
    console.log("error withdrawing: " + util.inspect(error));
  }
}
//withdrawEth();

async function depositEth() {
  let a = new IdexClient("0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499");
  try {
    let b = await a.depositEth("0.01");
    console.log("deposit Response: " + util.inspect(b));
  } catch (error) {
    console.log("error depositing: " + util.inspect(error));
  }
}
depositEth();
