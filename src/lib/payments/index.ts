/**
 * PAYMENT SCAFFOLD
 * ================
 *
 * No money moves through this file. `MockPaymentProvider` approves everything
 * and hands back a fake reference so the checkout flow can be clicked end to
 * end during development.
 *
 * To go live, write a class that implements `PaymentProvider` against your
 * gateway and swap the one line in `getPaymentProvider()`. Nothing else in the
 * app touches the gateway.
 *
 * Notes for whoever wires up the real one:
 *
 *  - Card data must never reach this server. Use the gateway's hosted fields or
 *    tokenizer in the browser, post the resulting token here, and charge that.
 *    Anything else drags you into PCI-DSS scope you do not want.
 *  - `authorize` should authorize only. Capture on fulfilment, so a cancelled
 *    order never needs a refund.
 *  - Confirm the amount server-side from the cart. Never trust a total that
 *    arrives in the request body — that is a trivial price-tampering hole.
 *  - Make `capture` idempotent, keyed on the order id, so a retried webhook
 *    cannot double-charge.
 *  - Card processing for research-chemical merchants is frequently declined by
 *    mainstream processors. Expect to need a high-risk acquirer, and expect
 *    them to ask for the compliance gate and the research-use-only labelling
 *    that this storefront already implements.
 */

export interface PaymentAmount {
  /** Minor units, e.g. cents. */
  value: number;
  currency: "USD";
}

export interface AuthorizeInput {
  orderId: string;
  amount: PaymentAmount;
  /** Opaque token produced by the gateway's client-side tokenizer. */
  paymentToken: string;
  email: string;
  billingPostalCode?: string;
}

export interface PaymentResult {
  ok: boolean;
  /** Gateway transaction id, stored on the order. */
  reference?: string;
  /** Machine-readable failure reason, e.g. "card_declined". */
  errorCode?: string;
  /** Safe to show a customer. */
  errorMessage?: string;
}

export interface PaymentProvider {
  readonly name: string;
  authorize(input: AuthorizeInput): Promise<PaymentResult>;
  capture(reference: string, amount: PaymentAmount): Promise<PaymentResult>;
  refund(reference: string, amount: PaymentAmount): Promise<PaymentResult>;
}

/**
 * Development stand-in. Approves anything except the conventional test tokens
 * below, so the failure branch of checkout stays reachable without a gateway.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  private static readonly DECLINE_TOKENS = new Set([
    "tok_decline",
    "tok_insufficient_funds",
  ]);

  async authorize(input: AuthorizeInput): Promise<PaymentResult> {
    await delay(600); // Approximate the latency of a real gateway round-trip.

    if (MockPaymentProvider.DECLINE_TOKENS.has(input.paymentToken)) {
      return {
        ok: false,
        errorCode: "card_declined",
        errorMessage: "That card was declined. Try a different payment method.",
      };
    }

    if (input.amount.value <= 0) {
      return {
        ok: false,
        errorCode: "invalid_amount",
        errorMessage: "Order total must be greater than zero.",
      };
    }

    return { ok: true, reference: `mock_auth_${input.orderId}` };
  }

  async capture(reference: string): Promise<PaymentResult> {
    await delay(200);
    return { ok: true, reference: reference.replace("auth", "cap") };
  }

  async refund(reference: string): Promise<PaymentResult> {
    await delay(200);
    return { ok: true, reference: reference.replace("cap", "ref") };
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let provider: PaymentProvider | null = null;

/** Swap the constructor here once a real gateway is wired up. */
export function getPaymentProvider(): PaymentProvider {
  provider ??= new MockPaymentProvider();
  return provider;
}
