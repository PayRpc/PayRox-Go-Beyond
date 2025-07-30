import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking function selectors...");
  
  const getFacetInfoSelector = ethers.id("getFacetInfo()").slice(0, 10);
  const getFacetInfoBSelector = ethers.id("getFacetInfoB()").slice(0, 10);
  
  console.log("getFacetInfo() selector:", getFacetInfoSelector);
  console.log("getFacetInfoB() selector:", getFacetInfoBSelector);
  
  // Check manifest routes
  const fs = require("fs");
  const path = require("path");
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../manifests/current.manifest.json"), "utf8"));
  
  console.log("\n📋 Manifest routes for these selectors:");
  for (const route of manifest.routes) {
    if (route.selector === getFacetInfoSelector || route.selector === getFacetInfoBSelector) {
      console.log(`${route.selector} → ${route.facet}`);
    }
  }
}

main().catch(console.error);
