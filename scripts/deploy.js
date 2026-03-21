import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  const BeamUp = await ethers.getContractFactory('BeamUp');
  console.log('Déploiement du contrat BeamUp...');
  
  const beamUp = await BeamUp.deploy();
  await beamUp.waitForDeployment();

  const address = await beamUp.getAddress();
  console.log('Contrat déployé à l adresse :', address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});