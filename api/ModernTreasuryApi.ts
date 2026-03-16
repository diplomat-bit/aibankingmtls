import * as runtime from '../runtime';

export interface ModernTreasuryResource {
    id: string;
    [key: string]: any;
}

export interface CreateAccountCollectionFlowRequest {
    counterparty_id: string;
    payment_types: string[];
    receiving_countries: string[];
}

export interface CreatePaymentFlowRequest {
    counterparty_id: string;
    amount: number;
    currency: string;
    direction: string;
    originating_account_id: string;
}

export class ModernTreasuryApi extends runtime.BaseAPI {
    async getCounterparties(): Promise<ModernTreasuryResource[]> {
        const response = await this.request({
            path: `/api/modern_treasury/counterparties`,
            method: 'GET',
            headers: {},
        });
        return await response.json();
    }

    async getInternalAccounts(): Promise<ModernTreasuryResource[]> {
        const response = await this.request({
            path: `/api/modern_treasury/internal_accounts`,
            method: 'GET',
            headers: {},
        });
        return await response.json();
    }

    async getAccounts(): Promise<ModernTreasuryResource[]> {
        const response = await this.request({
            path: `/api/modern_treasury/accounts`,
            method: 'GET',
            headers: {},
        });
        return await response.json();
    }

    async getVirtualAccounts(): Promise<ModernTreasuryResource[]> {
        const response = await this.request({
            path: `/api/modern_treasury/virtual_accounts`,
            method: 'GET',
            headers: {},
        });
        return await response.json();
    }

    async createAccountCollectionFlow(request: CreateAccountCollectionFlowRequest): Promise<{ client_token: string }> {
        const response = await this.request({
            path: `/api/modern_treasury/account_collection_flows`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: request,
        });
        return await response.json();
    }

    async createPaymentFlow(request: CreatePaymentFlowRequest): Promise<{ client_token: string }> {
        const response = await this.request({
            path: `/api/modern_treasury/payment_flows`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: request,
        });
        return await response.json();
    }
}
