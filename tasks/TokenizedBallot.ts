import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { MyToken__factory, TokenizedBallot__factory } from "../typechain-types";
import { task } from "hardhat/config";

dotenv.config();

const options = {
  alchemy: process.env.ALCHEMY_API_KEY,
  infura: process.env.INFURA_API_KEY,
};
let provider = ethers.getDefaultProvider("goerli", options);
let wallet;
if (process.env.WALLET_PRIVATE_KEY != undefined) {
  wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY ?? "", provider);
} else if (process.env.MNEMONIC) {
  wallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC ?? "");
} else {
  throw new Error("WALLET_PRIVATE_KEY or MNEMONIC is needed.");
}
console.log(`Using address ${wallet.address}`);
let signer = wallet.connect(provider);
let tokenFactory = new MyToken__factory(signer);
let ballotFactory = new TokenizedBallot__factory(signer);

const logResult = (receipt: ethers.ContractReceipt) => {
  console.log(`Nb of confirmations: ${receipt.confirmations}`);
  console.log(
    `Tx cost: ${ethers.utils.formatEther(
      receipt.gasUsed.mul(receipt.effectiveGasPrice)
    )} GoerliETH`
  );
};
/*
deploy a token
*/
task("token", "Deploy a new instance of the token").setAction(async () => {
  const tokenContract = await tokenFactory.deploy();
  await tokenContract.deployed();
  console.log(`Token contract deployed to ${tokenContract.address}`);
});

/*
    @param contractAddress: address of the token
    @param destinationAddress: address to mint tokens to 
    @param mintAmount: number of tokens to mint in human readable numbers
*/
task("mint", "Mint token to provided addresses")
  .addPositionalParam("contractAddress")
  .addPositionalParam("destinationAddress")
  .addPositionalParam("mintAmount")
  .setAction(async (taskArgs) => {
    /* test addresses:
        0x963625ac45cC696Ad5Fe467Ebf4d62C9542b7726 macnum
        0xA89a06aDe3B2Cb55971D9240f11E39bc615b7049 titanium
        0x6EaCc549C6378CA0506452899a1210060Ee71C20 Nelson
        0x8078C37e6b710Ad3CCc90B0Bd999eD44d3613316 Kalote
    */
    console.log(taskArgs);

    const token = tokenFactory.attach(taskArgs.contractAddress);
    const tx = await token.mint(
      taskArgs.destinationAddress,
      ethers.utils.parseEther(taskArgs.mintAmount)
    );

    const receipt = await tx.wait();
    logResult(receipt);
  });

task(
  "ballot",
  "Deploy an instance of Tokenized Ballot with default Proposal Names and reference block 0"
)
  .addPositionalParam("tokenContract")
  .setAction(async (taskArgs) => {
    const PROPOSALS = ["Chocolate", "Vanilla", "Pistachio"];
    const propBytes = PROPOSALS.map((el) =>
      ethers.utils.formatBytes32String(el)
    );

    const ballot = await ballotFactory.deploy(
      propBytes,
      taskArgs.tokenContract,
      0
    );

    console.log(`Ballot contract deployed to ${ballot.address}`);
  });

task(
  "vote",
  "Vote on a proposal number for the provided tokenized ballot contract"
)
  .addPositionalParam("ballotContract")
  .addPositionalParam("proposalNumber")
  .addPositionalParam("votingAmount")
  .setAction(async (taskArgs) => {
    const ballot = ballotFactory.attach(taskArgs.ballotContract);

    const tx = await ballot.vote(
      taskArgs.proposalNumber,
      ethers.utils.parseEther(taskArgs.votingAmount)
    );

    const receipt = await tx.wait();
    logResult(receipt);
  });
