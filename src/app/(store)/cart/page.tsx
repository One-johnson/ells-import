"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingCart, ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [pendingRemoveProductId, setPendingRemoveProductId] = useState<Id<"products"> | null>(null);

  const cart = useQuery(api.carts.get, sessionToken ? { sessionToken } : "skip");
  const productIds = cart?.items?.map((i) => i.productId) ?? [];
  const products = useQuery(
    api.products.getByIds,
    productIds.length > 0 ? { productIds } : "skip"
  );
  const removeItem = useMutation(api.carts.removeItem);
  const updateQuantity = useMutation(api.carts.updateItemQuantity);

  const productMap = new Map(
    (products ?? []).map((p) => [p._id, p])
  );

  const isLoggedIn = !!sessionToken;
  const pendingProduct = pendingRemoveProductId ? productMap.get(pendingRemoveProductId) : null;

  function openRemoveConfirm(productId: Id<"products">) {
    setPendingRemoveProductId(productId);
    setRemoveConfirmOpen(true);
  }

  function closeRemoveConfirm() {
    setRemoveConfirmOpen(false);
    setPendingRemoveProductId(null);
  }

  async function handleRemove(productId: Id<"products">) {
    if (!sessionToken) return;
    await removeItem({ sessionToken, productId });
    toast.success("Removed from cart");
    closeRemoveConfirm();
  }

  async function handleQuantityChange(
    productId: Id<"products">,
    priceSnapshot: number,
    currentQty: number,
    delta: number
  ) {
    if (!sessionToken) return;
    const newQty = Math.max(0, currentQty + delta);
    await updateQuantity({
      sessionToken,
      productId,
      quantity: newQty,
      priceSnapshot,
    });
    if (newQty === 0) toast.success("Removed from cart");
  }

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Cart</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to view and manage your cart.
        </p>
        <Button asChild className="mt-4">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const hasItems = items.length > 0;

  // priceSnapshot is stored in pesewas (same as admin); display in cedis
  const subtotal = items.reduce(
    (sum, i) => sum + i.priceSnapshot * i.quantity,
    0
  );
  const subtotalInCedis = subtotal / 100;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">Cart</h1>

      {!hasItems ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <ShoppingCart className="mx-auto size-14 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">Your cart is empty.</p>
          <Button asChild variant="default" className="mt-4">
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-4">
            {items.map((item) => {
              const product = productMap.get(item.productId);
              if (!product) return null;
              return (
                <div
                  key={item.productId}
                  className="flex gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ShoppingBag className="size-8 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground line-clamp-2">
                      {product.name}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#5c4033] dark:text-[#c9a227]">
                      {formatCurrency(item.priceSnapshot / 100)} each
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="flex items-center rounded-md border border-input">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="h-8 w-8 rounded-r-none"
                          onClick={() =>
                            handleQuantityChange(
                              item.productId,
                              item.priceSnapshot,
                              item.quantity,
                              -1
                            )
                          }
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="min-w-8 text-center text-sm font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="h-8 w-8 rounded-l-none"
                          onClick={() =>
                            handleQuantityChange(
                              item.productId,
                              item.priceSnapshot,
                              item.quantity,
                              1
                            )
                          }
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => openRemoveConfirm(item.productId)}
                        aria-label="Remove from cart"
                      >
                        <Trash2 className="size-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium text-foreground">
                      {formatCurrency((item.priceSnapshot * item.quantity) / 100)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="shrink-0 lg:w-80">
            <div className="sticky top-24 rounded-xl border border-border bg-card p-4">
              <h2 className="font-semibold text-foreground">Summary</h2>
              <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(subtotalInCedis)}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Shipping and taxes calculated at checkout.
              </p>
              <Button asChild className="mt-4 w-full" size="lg">
                <Link href="/checkout">Proceed to checkout</Link>
              </Button>
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link href="/shop">Continue shopping</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={removeConfirmOpen} onOpenChange={(open) => !open && closeRemoveConfirm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove from cart?</DialogTitle>
            <DialogDescription>
              {pendingProduct
                ? `"${pendingProduct.name}" will be removed from your cart.`
                : "This item will be removed from your cart."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeRemoveConfirm}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingRemoveProductId && handleRemove(pendingRemoveProductId)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
