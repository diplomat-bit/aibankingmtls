
export class ModernTreasuryApi {
  private accessToken: string;
  
  constructor(options: { accessToken: string }) {
    this.accessToken = options.accessToken;
  }

  async saveCredentials(creds: { apiKey: string, organizationId: string }) {
    const response = await fetch('/api/modern_treasury/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(creds)
    });
    if (!response.ok) throw new Error('Failed to save credentials');
    return await response.json();
  }

  async getInternalAccounts() {
    const response = await fetch('/api/modern_treasury/accounts', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch accounts');
    return await response.json();
  }
}
