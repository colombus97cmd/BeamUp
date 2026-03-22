const { ethers } = require("ethers");

async function checkLatestWork() {
  try {
    const provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
    // Minimal ABI
    const abi = ["function getAllWorks() view returns (tuple(address creator, string ipfsCID, string title, string category, uint256 totalTips, uint256 timestamp, uint256 likesCount)[])"];
    const contract = new ethers.Contract("0x0CD69B6D6c439977A0265dcA7f5B347E1b705117", abi, provider);
    
    console.log("Fetching works from Mainnet...");
    const works = await contract.getAllWorks();
    
    if (works.length === 0) {
      console.log("No works found.");
      return;
    }
    
    const latestWork = works[works.length - 1];
    console.log("Latest Work:");
    console.log("Title: " + latestWork.title);
    console.log("Category: " + latestWork.category);
    console.log("CID: " + latestWork.ipfsCID);
    
    console.log("\nTesting Gateways...");
    const cid = latestWork.ipfsCID;
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`
    ];
    
    for (const url of gateways) {
      try {
        const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        console.log(`[${res.status}] ${url}`);
      } catch(e) {
        console.log(`[Error/Timeout] ${url}`);
      }
    }
  } catch(e) {
    console.error(e);
  }
}

checkLatestWork();
