import type { BillingProvider } from "./provider.js";

export class PolarAdapter implements BillingProvider {
  readonly name = "polar";

  async createCheckoutUrl(customerId: string, priceId: string): Promise<string> {
    return `https://polar.sh/checkout/${priceId}?customer=${encodeURIComponent(customerId)}`;
  }
}
