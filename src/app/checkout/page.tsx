import { CheckoutForm } from "./checkout-form";

export const metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">Checkout</h1>
      <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
        Confirm delivery details. Payment is completed via WhatsApp for now; card checkout (Paystack) can be turned on
        later in store settings.
      </p>
      <div className="mt-8">
        <CheckoutForm />
      </div>
    </div>
  );
}
