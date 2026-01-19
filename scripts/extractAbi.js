import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contracts = ['PredictionToken', 'PredictionMarket', 'MarketFactory'];

contracts.forEach(contractName => {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const abiPath = path.join(__dirname, '..', 'frontend', 'src', 'contracts', `${contractName}.json`);
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log(`✅ Extracted ${contractName} ABI to frontend/src/contracts/${contractName}.json`);
});

// Also copy deployment info
const deploymentPath = path.join(__dirname, '..', 'deployment.json');
const frontendDeploymentPath = path.join(__dirname, '..', 'frontend', 'src', 'contracts', 'deployment.json');
fs.copyFileSync(deploymentPath, frontendDeploymentPath);
console.log('✅ Copied deployment.json to frontend');

console.log('\n✅ All ABIs and deployment info extracted successfully!');
