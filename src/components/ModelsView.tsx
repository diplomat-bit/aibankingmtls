import React from 'react';

const models = [
  'V1CheckoutSessionsPost200ResponseInvoiceCreationInvoiceData',
  'V1CheckoutSessionsGet200ResponseDataInnerInvoiceCreationInvoiceData',
  'AccountSettings',
  'V1TerminalLocationsPost200Response',
  'V1TerminalLocationsGet200ResponseDataInner',
  'V1TreasuryCreditReversalsGet200ResponseDataInner',
  'V1ForwardingRequestsGet200ResponseDataInner',
  'V1TestHelpersTreasuryReceivedCreditsPost200ResponseInitiatingPaymentMethodDetails',
  'V1TaxTransactionsCreateFromCalculationPost200ResponseLineItemsDataInner',
  'V1CheckoutSessionsGet200ResponseDataInnerPaymentMethodOptionsCard',
  'V1IssuingDisputesGet200ResponseDataInner',
  'V1SubscriptionSchedulesPost200ResponsePhasesInnerAddInvoiceItemsInner',
  'V1PromotionCodesPost200Response',
  'V1TreasuryTransactionsGet200ResponseDataInnerEntriesDataInnerFlowDetailsReceivedCreditLinkedFlowsSourceFlowDetails',
  'V1InvoicesGet200ResponseDataInner',
  'V1ConfirmationTokensConfirmationTokenGet200ResponsePaymentMethodPreviewUsBankAccount',
  'InvoicesResourceShippingCostShippingRate',
  'V1CheckoutSessionsPost200Response',
  'V1CheckoutSessionsGet200ResponseDataInner'
];

export const ModelsView: React.FC = () => {
  return (
    <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8">
      <h2 className="text-xl font-bold mb-6">Available Models</h2>
      <ul className="space-y-2">
        {models.map(model => (
          <li key={model} className="text-zinc-400 font-mono text-sm bg-white/5 p-2 rounded-lg">{model}</li>
        ))}
      </ul>
    </div>
  );
};
