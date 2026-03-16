import * as runtime from '../runtime';
import { FdxPayee, FdxPayment, FdxRecurringPayment } from '../src/types';

export class FdxMoneyMovementApi extends runtime.BaseAPI {
    async searchForPayees(): Promise<{ payees: FdxPayee[] }> {
        const response = await this.request({
            path: '/api/billmgmt/billpay/v2/fdx/v6/payees/search',
            method: 'GET',
            headers: {},
        });
        return await response.json();
    }

    async searchForPayments(): Promise<{ payments: FdxPayment[] }> {
        const response = await this.request({
            path: '/api/billmgmt/billpay/v2/fdx/v6/payments/search',
            method: 'GET',
            headers: {},
        });
        return await response.json();
    }

    async searchForRecurringPayments(): Promise<{ recurringPayments: FdxRecurringPayment[] }> {
        const response = await this.request({
            path: '/api/billmgmt/billpay/v2/fdx/v6/recurring-payments/search',
            method: 'GET',
            headers: {},
        });
        return await response.json();
    }
}
