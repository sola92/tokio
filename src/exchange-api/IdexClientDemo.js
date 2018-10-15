import IdexClient from "./IdexClient";
import {
  getPriceForAmount,
  getOrdersForAmount,
  getOrderBook,
  getOpenOrders
} from "./IdexApi";
import "../hancock/init-db";
const util = require("util");
import { development as KnexDev } from "../hancock/knexfile";
import Knex from "knex";
export const knex = Knex(KnexDev);

async function postABuyOrder() {
  let a = new IdexClient("0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499");
  try {
    let b = await a.postBuyOrder({
      tokenTicker: "LINK",
      price: "0.00000029",
      amount: "517242"
    });
    console.log(b.data);
  } catch (error) {
    console.log("error: " + util.inspect(error.response));
  }
}
//postABuyOrder();

async function getPriceToBuy10Link() {
  try {
    let b = await getPriceForAmount("LINK", "1000", "buy");
    console.log(JSON.stringify(b));
  } catch (error) {
    //console.log("error: " + error.response.data.error);
    console.log("error: " + util.inspect(error));
  }
}
//getPriceToBuy10Link();

async function getPriceToSell10Link() {
  try {
    let b = await getPriceForAmount("LINK", "1000", "sell");
    console.log(JSON.stringify(b));
  } catch (error) {
    //console.log("error: " + error.response.data.error);
    console.log("error: " + util.inspect(error));
  }
}
//getPriceToSell10Link();

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
    let b = await a.buyToken({
      tokenTicker: "LINK",
      amount: 1,
      expectedTotalPrice: "0.00169083",
      priceTolerance: "0.1"
    });
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
    let b = await a.withdrawToken("ETH", "20");
    console.log("withdraw Response: " + b.data);
  } catch (error) {
    console.log("error withdrawing: " + util.inspect(error));
  }
}
//withdrawEth();

async function depositEth() {
  let a = new IdexClient("0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499");
  //let a = new IdexClient("0x18f9fe813d25ed16b1a98431a3115a7da5752ab8");
  try {
    let b = await a.depositEth("0.000001");
    console.log("deposit Response: " + util.inspect(b));
  } catch (error) {
    console.log("error depositing: " + util.inspect(error));
  } finally {
    knex.destroy();
  }
}
depositEth();
