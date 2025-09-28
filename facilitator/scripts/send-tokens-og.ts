import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Sending tokens to merchant address on 0G Testnet...");
  
  const [deployer] = await ethers.getSigners();
  const merchantAddress = "0xAF9fC206261DF20a7f2Be9B379B101FAFd983117";
  const tokenAddress = "0x40E81E7748323C92382C97f050E5C7975DBdea18";
  
  console.log("📋 Details:");
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Merchant: ${merchantAddress}`);
  console.log(`  Token: ${tokenAddress}`);
  
  // Get the contract
  const WeatherToken = await ethers.getContractFactory("WeatherToken");
  const token = WeatherToken.attach(tokenAddress);
  
  // Send 1000 tokens to merchant
  const amount = ethers.parseEther("1000");
  console.log(`💰 Sending ${ethers.formatEther(amount)} WAT tokens...`);
  
  const tx = await token.transfer(merchantAddress, amount);
  console.log(`📝 Transaction hash: ${tx.hash}`);
  
  await tx.wait();
  console.log("✅ Tokens sent successfully!");
  
  // Check balance
  const balance = await token.balanceOf(merchantAddress);
  console.log(`💳 Merchant balance: ${ethers.formatEther(balance)} WAT`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
