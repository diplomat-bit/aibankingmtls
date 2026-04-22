export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  userId: string;
  type: 'checking' | 'savings';
  balance: number;
  currency: string;
  accountNumber: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  merchant?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface Investment {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  quantity: number;
  costBasis: number;
  currentPrice: number;
  type: 'stock' | 'crypto' | 'etf' | 'bond';
}

export interface Card {
  id: string;
  userId: string;
  type: 'debit' | 'credit';
  brand: string;
  last4: string;
  expiryDate: string;
  status: 'active' | 'blocked' | 'expired';
  limit?: number;
  spent?: number;
}

export interface UserConnection {
  id?: string;
  userId: string;
  service: 'stripe' | 'modern_treasury' | 'aibanking' | 'citi';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  connectedAt: string;
  externalAccountId?: string;
}

// FDX Money Movement Types
export interface FdxPayee {
  payeeId: string;
  merchant: {
    displayName: string;
    name: {
      company: string;
    };
    address?: {
      line1: string;
      city: string;
      region: string;
      postalCode: string;
    };
    phone?: {
      type: string;
      country: string;
      number: string;
    };
  };
  merchantAccountIds: string[];
  status: 'ACTIVE' | 'DELETED' | 'PENDING' | 'REJECTED';
  expiresTimestamp?: string;
}

export interface FdxPayment {
  paymentId: string;
  recurringPaymentId?: string;
  fromAccountId: string;
  toPayeeId: string;
  amount: number;
  merchantAccountId?: string;
  dueDate: string;
  processedTimestamp?: string;
  startedProcessingTimestamp?: string;
  status: 'CANCELLED' | 'FAILED' | 'NOFUNDS' | 'PROCESSED' | 'PROCESSING' | 'SCHEDULED';
}

export interface FdxRecurringPayment {
  recurringPaymentId: string;
  fromAccountId: string;
  toPayeeId: string;
  amount: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'TWICEMONTHLY' | 'MONTHLY' | 'FOURWEEKS' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'ANNUALLY';
  duration: {
    type: 'NOEND' | 'NUMBEROFTIMES';
    numberOfTimes?: number;
  };
  merchantAccountId?: string;
  dueDate: string;
  cancelledTimestamp?: string;
  status: 'CANCELLED' | 'FAILED' | 'PROCESSED' | 'SCHEDULED';
}

export interface Ledger {
  id: string;
  name: string;
  description: string;
  currency: string;
}

export interface CreditSpecificRecommendation {
  recommendedCreditLimit: string;
  btMaximumLoanPercentage: string;
  btMonthlyInterestRate: string;
  eppMaximumLoanPercentage: string;
  eppMonthlyInterestRate: string;
  btCampaignId: string;
  eppPromoId: string;
  effectiveInterestRate: string;
  annualPercentageRate: string;
  totalRepaymentAmount: string;
  dailyInterestAmount: string;
  annualFeeAmount: string;
  creditApprovalExpiryDate: string;
  creditApprovalExpiredFlag: string;
}

export interface RepaymentSchedule {
  tenorOccurence: string;
  paymentDueDate: string;
  monthlyInstallmentAmount: string;
  principalAmount: string;
  interestAmount: string;
  remainingPrincipalAmount: string;
}

export interface ExistingLoanDetail {
  productCode: string;
  organisationCode: string;
  sourceCode: string;
  requestedLoanAmount: string;
  outstandingLoanAmount: string;
  loanPayoffAmount: string;
  installmentAmount: string;
  annualPercentageRate: string;
  accountOpenedDate: string;
  accountNumber: string;
}

export interface LoanSpecificRecommendation {
  loanAmount: string;
  tenor: string;
  interestRate: string;
  handlingFee: string;
  installmentAmount: string;
  installmentAmountWithInsurance: string;
  annualPercentageRate: string;
  totalPrincipalAmount: string;
  totalInterestAmount: string;
  totalInstallmentAmount: string;
  monthlyFeeAmount: string;
  insurancePremiumAmount: string;
  pricingPlanId: string;
  totalRepaymentAmount: string;
  grossLoanAmount: string;
  totalCostOfCreditWithoutInsurance: string;
  totalCostOfCreditWithInsurance: string;
  aprRetentionFlag: string;
  creditApprovalExpiryDate: string;
  repaymentScheduleIssueDate: string;
  repaymentSchedule: RepaymentSchedule[];
  handlingFeePercentage: string;
  maximumInstallmentAmount: string;
  maximumTenor: string;
  maximumLoanAmountWithDocument: string;
  maximumLoanAmountWithoutDocument: string;
  maximumLoanAmtWithoutSpouseConsent: string;
  topupLoanFlag: string;
  topupLoanExpiryDate: string;
  totalLoanAmountIncExistingLoanAmt: string;
  offeredFutureAnnualPercentageRate: string;
  existingLoanDetails: ExistingLoanDetail[];
  creditApprovalExpiredFlag: string;
  topupLoanExpiredFlag: string;
}

export interface RequiredDocument {
  documentId: string;
  documentStatus: string;
  documentType: string;
  applicantType: string;
  documentInternalId: string;
}

export interface ProductDecision {
  productCode: string;
  organisationCode: string;
  sourceCode: string;
  creditDecision: string;
  offerProductCategory: string;
  offerDocumentCriteria: string;
  ipaRecommendation: string;
  offerSequenceId: string;
  marketingOfferOriginatingBranchId: string;
  marketingOfferCampaignId: string;
  marketingOfferWaveId: string;
  creditSpecificRecommendations: CreditSpecificRecommendation[];
  loanSpecificRecommendations: LoanSpecificRecommendation[];
  requiredDocuments: RequiredDocument[];
}

export interface KbaQuestionnaire {
  vedaQuestionnaire: any[];
}

export interface OfferAcceptanceResponse {
  status: string;
  applicationStage: string;
  ipaExpiryDate: string;
  kbaRequiredFlag: string;
  bureauPullExpiredFlag: string;
  requestedProductDecision: ProductDecision[];
  counterOffers: ProductDecision[];
  crossSellOffers: ProductDecision[];
  suggestedOffers: ProductDecision[];
  kbaQuestionnaire: KbaQuestionnaire;
}

export interface ProductDetail {
  productCode: string;
  addProductStatusDescription: string;
}

export interface ProductDetailResponse {
  status: string;
  applicationId: string;
  productDetails: ProductDetail[];
}

export interface PlaidCredentials {
  clientId: string;
  secret: string;
  environment: 'sandbox' | 'development' | 'production';
}

export interface MarqetaCredentials {
  token: string;
  secret: string;
}

export interface ModernTreasuryCredentials {
  apiKey: string;
  organizationId: string;
}

declare global {
  interface Window {
    ethereum?: any;
  }
  namespace JSX {
    interface IntrinsicElements {
      'appkit-button': any;
    }
  }
}
