import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentInfo {
  assetRegistry: {
    address: string;
  };
}

const SAMPLE_ASSETS = [
  {
    tokenId: 1,
    title: "2019 Audi A4 Sedan",
    category: "vehicle",
    identifiers: JSON.stringify({
      vin: "WAUKMAF49KA123456",
      plate: "ABC123"
    }),
    attributes: JSON.stringify({
      make: "Audi",
      model: "A4",
      year: 2019,
      color: "Black",
      mileage: 45000
    }),
    note: "Well maintained, single owner, full service history"
  },
  {
    tokenId: 2,
    title: "MacBook Pro 16\" 2023",
    category: "equipment",
    identifiers: JSON.stringify({
      serial: "C02DJ0AHMD6T"
    }),
    attributes: JSON.stringify({
      make: "Apple",
      model: "MacBook Pro",
      year: 2023,
      color: "Space Gray",
      storage: "1TB SSD"
    }),
    note: "Excellent condition, includes original box and charger"
  },
  {
    tokenId: 3,
    title: "Downtown Condo Unit 401",
    category: "property",
    identifiers: JSON.stringify({
      address: "123 Main St, Unit 401, Downtown"
    }),
    attributes: JSON.stringify({
      type: "Condominium",
      area: 850,
      year: 2018,
      rooms: 2,
      bathrooms: 2
    }),
    note: "Modern condo with city views, recently renovated"
  }
];

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Seeding with account:", deployer.address);

  // Load deployment info
  const deploymentPath = path.join(__dirname, "../deployments.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment file not found. Please run deploy script first.");
  }

  const deploymentInfo: DeploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const assetRegistryAddress = deploymentInfo.assetRegistry.address;

  console.log("Using AssetRegistry at:", assetRegistryAddress);

  // Get contract instance
  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  const assetRegistry = AssetRegistry.attach(assetRegistryAddress);

  console.log("Minting sample assets...");

  for (const asset of SAMPLE_ASSETS) {
    console.log(`Minting asset ${asset.tokenId}: ${asset.title}`);
    
    try {
      const tx = await assetRegistry.mint(
        asset.tokenId,
        asset.title,
        asset.category,
        asset.identifiers,
        asset.attributes,
        asset.note
      );
      
      await tx.wait();
      console.log(`✅ Asset ${asset.tokenId} minted successfully`);
      
      // Verify the asset was minted
      const owner = await assetRegistry.ownerOf(asset.tokenId);
      const metadata = await assetRegistry.getAssetMetadata(asset.tokenId);
      
      console.log(`   Owner: ${owner}`);
      console.log(`   Title: ${metadata.title}`);
      console.log(`   Category: ${metadata.category}`);
      
    } catch (error: any) {
      if (error.message.includes("token already minted")) {
        console.log(`⚠️  Asset ${asset.tokenId} already exists, skipping`);
      } else {
        console.error(`❌ Failed to mint asset ${asset.tokenId}:`, error.message);
      }
    }
  }

  console.log("\n📊 Portfolio Summary:");
  for (const asset of SAMPLE_ASSETS) {
    try {
      const owner = await assetRegistry.ownerOf(asset.tokenId);
      const isInEscrow = await assetRegistry.isInEscrow(asset.tokenId);
      const status = isInEscrow ? "In Escrow" : "Owned";
      
      console.log(`Token ${asset.tokenId}: ${asset.title} - ${status} (Owner: ${owner.slice(0, 8)}...)`);
    } catch (error) {
      console.log(`Token ${asset.tokenId}: Not minted`);
    }
  }

  console.log("\n✅ Seeding completed successfully!");
  console.log("\nNext steps:");
  console.log("1. Start the indexer service to track events");
  console.log("2. Start the watcher service for Bitcoin integration");
  console.log("3. Launch the web application");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });