export interface BillingAddress {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CreditCardDetails {
  pan: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  holderName: string;
  billingAddress?: BillingAddress;
}

export interface CreditCardSaleRequestDto {
  amount: number;
  currency: string;
  card: CreditCardDetails;
}

export interface CreditCardAuthorizeRequestDto {
  amount: number;
  currency: string;
  card: CreditCardDetails;
}

export interface CreditCardCaptureRequestDto {
  amount: number;
  transactionReference: string;
}

export interface CreditCardRefundRequestDto {
  amount: number;
  transactionReference: string;
}

export interface CreditCardVoidRequestDto {
  transactionReference: string;
}

export interface EcheckDetails {
  accountNumber: string;
  routingNumber: string;
  accountType: 'checking' | 'savings';
  accountName: string;
  billingAddress?: BillingAddress;
}

export interface EcheckSaleRequestDto {
  amount: number;
  currency: string;
  echeck: EcheckDetails;
}

export interface EcheckRefundRequestDto {
  amount: number;
  transactionReference: string;
}

export interface EcheckVoidRequestDto {
  transactionReference: string;
}

export interface PaymentResponseDto {
  success: boolean;
  transactionReference?: string;
  responseCode?: string;
  responseMessage?: string;
  cardBrand?: string;
  cardLastFour?: string;
  cardToken?: string;
  rawResponse: string;
}

export interface GatewayResponseDto extends PaymentResponseDto {}
