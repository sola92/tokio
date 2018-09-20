import IdexClient from "./IdexClient";
import { getAsksOrderBook } from "./IdexApi";
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
  let a = new IdexClient("0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499");
  try {
    let b = await getAsksOrderBook("LINK");
    console.log(b.data);
  } catch (error) {
    //console.log("error: " + error.response.data.error);
    console.log("error: " + util.inspect(error));
  }
}
//printLinkAsks();

async function buy1Link() {
  let a = new IdexClient("0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499");
  try {
    let b = await a.buyToken("LINK", 1, "0.00000029", "0.00000029");
    console.log(b.data);
  } catch (error) {
    //console.log("error: " + error.response.data.error);
    console.log("error: " + util.inspect(error));
  }
}
buy1Link();
