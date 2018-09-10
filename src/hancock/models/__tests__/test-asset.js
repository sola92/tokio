//@flow
import "jest";
import "src/hancock/init-db";
import Asset from "../Asset";

test("test Asset.isTicker", async () => {
  const asset: Asset = await Asset.query().insert({
    name: "Foo Token",
    type: "erc20",
    ticker: "FOO",
    decimals: 20,
    abi: JSON.stringify({})
  });

  expect(asset.isTicker("foo")).toBeTruthy();
  expect(asset.isTicker("foO")).toBeTruthy();
  expect(asset.isTicker("fo0")).toBeFalsy();
});

test("test Asset.fromToken", async () => {
  await Asset.query().insert({
    name: "Bar Token",
    type: "erc20",
    ticker: "BAR",
    decimals: 20,
    abi: JSON.stringify({})
  });
  let asset: ?Asset = await Asset.fromTicker("BaR");
  expect(asset).not.toBeNull();

  asset = await Asset.fromTicker("Bat");
  expect(asset).toBeUndefined();
});
