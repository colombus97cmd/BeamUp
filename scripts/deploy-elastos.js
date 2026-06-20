const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying BeamUp to Elastos Smart Chain (ESC)...");
  console.log(`   Network: ${hre.network.name}`);
  console.log(`   Chain ID: ${hre.network.config.chainId || "auto"}`);
  console.log("");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`📋 Deployer address: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer balance: ${hre.ethers.formatEther(balance)} ELA`);
  console.log("");

  if (balance === 0n) {
    console.error("❌ Deployer has no ELA! Get some from:");
    console.error("   Mainnet: Buy ELA on an exchange and bridge to ESC");
    console.error("   Testnet: Use the Elastos testnet faucet");
    process.exit(1);
  }

  console.log("📦 Deploying BeamUp contract...");
  const BeamUp = await hre.ethers.getContractFactory("BeamUp");
  const beamUp = await BeamUp.deploy();
  await beamUp.waitForDeployment();

  const address = await beamUp.getAddress();
  
  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("✅ BeamUp deployed successfully on Elastos ESC!");
  console.log(`   Contract: ${address}`);
  console.log(`   Owner (receives 5%): ${deployer.address}`);
  console.log(`   Explorer: https://esc.elastos.io/address/${address}`);
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("📝 Next steps:");
  console.log("   1. Copy the contract address above");
  console.log("   2. Update CONTRACT_ADDRESSES in src/app/page.tsx");
  console.log("   3. Update NEXT_PUBLIC_ELASTOS_CONTRACT_ADDRESS in .env.local");
  console.log("   4. Verify on explorer: https://esc.elastos.io");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
