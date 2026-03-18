
export const plaidService = {
  createLinkToken: async (userId: string) => {
    console.log("Plaid createLinkToken called for", userId);
    return { link_token: "mock_link_token" };
  },
  exchangePublicToken: async (publicToken: string) => {
    console.log("Plaid exchangePublicToken called");
    return { access_token: "mock_access_token" };
  },
  createProcessorToken: async (accessToken: string, accountId: string, processor: string) => {
    console.log("Plaid createProcessorToken called");
    return { processor_token: "mock_processor_token" };
  }
};
