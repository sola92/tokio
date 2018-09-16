import IdexClient from "./IdexClient";

async function idexClientDemo() {
  let a = new IdexClient("0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499");
  try {
    let b = await a.postBuyOrder("LINK", "0.00000029", "517242");
    console.log(b.data);
  } catch (error) {
    console.log("error: " + error.response.data.error);
  }
}
idexClientDemo();
