import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy AssetRegistry
  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  console.log("Deploying AssetRegistry...");
  
  const assetRegistry = await AssetRegistry.deploy();
  await assetRegistry.waitForDeployment();
  
  const contractAddress = await assetRegistry.getAddress();
  console.log("AssetRegistry deployed to:", contractAddress);

  // Save deployment info
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    assetRegistry: {
      address: contractAddress,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber()
    }
  };

  const deploymentPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deploymentPath);

  // Verify deployment
  console.log("Verifying deployment...");
  const name = await assetRegistry.name();
  const symbol = await assetRegistry.symbol();
  const owner = await assetRegistry.owner();
  
  console.log("Contract name:", name);
  console.log("Contract symbol:", symbol);
  console.log("Contract owner:", owner);
  console.log("Next token ID:", await assetRegistry.nextTokenId());

  // Save to environment file if it exists
  const envPath = path.join(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const updatedContent = envContent.replace(
      /ASSET_REGISTRY_ADDRESS=.*/,
      `ASSET_REGISTRY_ADDRESS=${contractAddress}`
    );
    
    if (updatedContent === envContent) {
      // Add the address if it doesn't exist
      fs.appendFileSync(envPath, `\nASSET_REGISTRY_ADDRESS=${contractAddress}\n`);
    } else {
      fs.writeFileSync(envPath, updatedContent);
    }
    console.log("Contract address saved to .env file");
  }

  console.log("✅ Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });