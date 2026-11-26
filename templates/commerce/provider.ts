export interface BillingProvider {
  readonly name: string;
  createCheckoutUrl(customerId: string, priceId: string): Promise<string>;
}
