import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(configuration);

export const plaidService = {
  createLinkToken: async (userId: string) => {
    const response = await client.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Aura AI Bank',
      products: ['auth', 'transactions'] as any,
      country_codes: ['US'] as any,
      language: 'en',
    });
    return response.data;
  },
  exchangePublicToken: async (publicToken: string) => {
    const response = await client.itemPublicTokenExchange({
      public_token: publicToken,
    });
    return response.data;
  },
  createProcessorToken: async (accessToken: string, accountId: string, processor: string) => {
    const response = await client.processorTokenCreate({
      access_token: accessToken,
      account_id: accountId,
      processor: processor as any,
    });
    return response.data;
  }
};
