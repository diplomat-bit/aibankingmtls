
export const blockchainService = {
  bridgeToken: async (token: string, amount: number, destination: string) => {
    console.log("Blockchain bridgeToken called");
    return { tx_hash: "mock_tx_hash" };
  }
};
