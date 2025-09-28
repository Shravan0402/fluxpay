import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying WeatherToken to Polygon Amoy...");

  // Get the contract factory
  const WeatherToken = await ethers.getContractFactory("WeatherToken");

  // Deploy the contract
  const weatherToken = await WeatherToken.deploy();

  // Wait for deployment to complete
  await weatherToken.waitForDeployment();

  const contractAddress = await weatherToken.getAddress();
  console.log("✅ WeatherToken deployed to:", contractAddress);

  // Get contract info
  const name = await weatherToken.name();
  const symbol = await weatherToken.symbol();
  const totalSupply = await weatherToken.totalSupply();
  const weatherApiPrice = await weatherToken.getWeatherApiPrice();

  console.log("📊 Contract Details:");
  console.log("  Name:", name);
  console.log("  Symbol:", symbol);
  console.log("  Total Supply:", ethers.formatEther(totalSupply), "tokens");
  console.log("  Weather API Price:", ethers.formatEther(weatherApiPrice), "tokens");

  // Save deployment info
  const deploymentInfo = {
    network: "polygon-amoy",
    contractAddress: contractAddress,
    name: name,
    symbol: symbol,
    totalSupply: totalSupply.toString(),
    weatherApiPrice: weatherApiPrice.toString(),
    deployer: await weatherToken.runner?.getAddress(),
    timestamp: new Date().toISOString(),
  };

  console.log("💾 Deployment info saved to deployment.json");
  console.log("🔗 Contract on PolygonScan: https://amoy.polygonscan.com/address/" + contractAddress);

  return deploymentInfo;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
