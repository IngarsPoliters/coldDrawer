import { ethers } from "hardhat";

export async function deployAssetRegistryFixture() {
  const [owner, seller, buyer, other] = await ethers.getSigners();

  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  const assetRegistry = await AssetRegistry.deploy();
  await assetRegistry.waitForDeployment();

  return {
    assetRegistry,
    owner,
    seller,
    buyer,
    other
  };
}

export const SAMPLE_ASSET = {
  tokenId: 1n,
  title: "2019 Audi A4",
  category: "vehicle",
  identifiers: JSON.stringify({ vin: "WAUKMAF49KA123456", plate: "ABC123" }),
  attributes: JSON.stringify({ make: "Audi", model: "A4", year: 2019, color: "Black" }),
  note: "Well maintained, single owner"
};

export const SAMPLE_HTLC = {
  secret: "0x" + "a".repeat(64),
  hash: "0x" + ethers.keccak256(ethers.toUtf8Bytes("0x" + "a".repeat(64))).slice(2),
  priceBTC: 50000000n, // 0.5 BTC in satoshis
  expiryTimestamp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
};