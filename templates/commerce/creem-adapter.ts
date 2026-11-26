import type { BillingProvider } from "./provider.js";

export class CreemAdapter implements BillingProvider {
  readonly name = "creem";

  async createCheckoutUrl(customerId: string, priceId: string): Promise<string> {
    return `https://creem.io/checkout/${priceId}?customer=${encodeURIComponent(customerId)}`;
  }
}
