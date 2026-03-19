import * as runtime from '../runtime';
import { OfferAcceptanceResponse, ProductDetailResponse } from '../src/types';

export class CitiApi extends runtime.BaseAPI {
    async acceptOffer(applicationId: string, productCode: string): Promise<OfferAcceptanceResponse> {
        const response = await this.request({
            path: '/api/citi/accept-offer',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ applicationId, productCode }),
        });
        return await response.json();
    }

    async addProduct(applicationId: string, productCode: string): Promise<ProductDetailResponse> {
        const response = await this.request({
            path: '/api/citi/add-product',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ applicationId, productCode }),
        });
        return await response.json();
    }
}
