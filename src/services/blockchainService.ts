import { ethers } from 'ethers';

const JOC3_ADDRESS = '0x86b84Faaa0Ec1aBa8Bc5EEbB759B81DDf5C7590F';
const JOCALL3_ADDRESS = '0x495ba3E56640EF0c36802a7589cAafdD95e605De';

const JOC3_ABI = [
  "function transfer(address _to, uint256 _value) public returns (bool success)",
  "function balanceOf(address _owner) public view returns (uint256 balance)",
  "function depositFunds() public payable",
  "function withdrawFunds(uint256 _amount) public"
];

const JOCALL3_ABI = [
  "function bridgeToMainnet(string memory uuid, uint256 amount, string memory destinationChain) public payable",
  "function balanceOf(string memory uuid) public view returns (uint256)"
];

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const joc3Contract = new ethers.Contract(JOC3_ADDRESS, JOC3_ABI, wallet);
const jocall3Contract = new ethers.Contract(JOCALL3_ADDRESS, JOCALL3_ABI, wallet);

export const blockchainService = {
  bridgeToken: async (uuid: string, amount: string, destinationChain: string) => {
    // 1:1 peg: 1 token = 1 dollar. Amount is in tokens.
    const amountInWei = ethers.parseEther(amount);
    const tx = await jocall3Contract.bridgeToMainnet(uuid, amountInWei, destinationChain);
    return tx.wait();
  },
  getBalance: async (uuid: string) => {
    return await jocall3Contract.balanceOf(uuid);
  }
};
