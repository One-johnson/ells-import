"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function StarRow({ rating }: { rating: number }) {
  const full = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <p className="text-amber-600 dark:text-amber-400 text-sm" aria-label={`${full} out of 5 stars`}>
      {"★".repeat(full)}
      <span className="text-muted-foreground/40">{"★".repeat(5 - full)}</span>
    </p>
  );
}

function StarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={cn(
            "rounded p-0.5 text-lg leading-none transition disabled:opacity-50",
            n <= value ? "text-amber-500" : "text-muted-foreground/35 hover:text-muted-foreground/60",
          )}
          aria-label={`${n} star${n === 1 ? "" : "s"}${n === value ? ", selected" : ""}`}
          aria-pressed={n <= value}
        >
          ★
        </button>
      ))}
      <span className="text-muted-foreground ml-2 text-xs tabular-nums">{value} / 5</span>
    </div>
  );
}

type Props = {
  productId: Id<"products">;
  productSlug: string;
};

export function ProductReviewsPanel({ productId, productSlug }: Props) {
  const { sessionToken, isAuthenticated, isLoading: authLoading } = useAuth();
  const reviews = useQuery(api.reviews.listByProduct, { productId, limit: 50 });
  const mine = useQuery(api.reviews.listMine, sessionToken ? { sessionToken, limit: 100 } : "skip");

  const createReview = useMutation(api.reviews.create);
  const updateReview = useMutation(api.reviews.update);

  const myReview = useMemo(
    () => mine?.find((r) => r.productId === productId) ?? null,
    [mine, productId],
  );

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!myReview) {
      setRating(5);
      setTitle("");
      setBody("");
      setEditing(true);
      return;
    }
    setRating(myReview.rating);
    setTitle(myReview.title ?? "");
    setBody(myReview.body ?? "");
    setEditing(false);
  }, [myReview?._id]);

  const others = useMemo(() => {
    if (!reviews) {
      return [];
    }
    if (!myReview) {
      return reviews;
    }
    return reviews.filter((r) => r._id !== myReview._id);
  }, [reviews, myReview]);

  const nextPath = `/products/${encodeURIComponent(productSlug)}`;

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!sessionToken) {
        return;
      }
      setSaving(true);
      try {
        if (myReview) {
          await updateReview({
            sessionToken,
            reviewId: myReview._id,
            rating,
            title: title.trim(),
            body: body.trim(),
          });
          toast.success("Review updated");
          setEditing(false);
        } else {
          await createReview({
            sessionToken,
            productId,
            rating,
            title: title.trim() || undefined,
            body: body.trim() || undefined,
          });
          toast.success("Thanks — your review was posted");
          setEditing(false);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save review");
      } finally {
        setSaving(false);
      }
    },
    [sessionToken, myReview, createReview, updateReview, productId, rating, title, body],
  );

  return (
    <section aria-labelledby="reviews-heading" className="space-y-6">
      <h2 id="reviews-heading" className="text-foreground text-lg font-semibold tracking-tight">
        Reviews
      </h2>

      {authLoading ? (
        <p className="text-muted-foreground text-sm">…</p>
      ) : isAuthenticated && sessionToken ? (
        <div className="bg-muted/20 border-border rounded-lg border p-4">
          {myReview && !editing ? (
            <div className="space-y-3">
              <p className="text-foreground text-sm font-medium">Your review</p>
              <StarRow rating={myReview.rating} />
              {myReview.title ? (
                <p className="text-foreground text-sm font-medium">{myReview.title}</p>
              ) : null}
              {myReview.body ? (
                <p className="text-muted-foreground text-sm whitespace-pre-line">{myReview.body}</p>
              ) : null}
              <p className="text-muted-foreground text-xs">
                {new Date(myReview.updatedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit review
              </Button>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
              <p className="text-foreground text-sm font-medium">{myReview ? "Edit your review" : "Write a review"}</p>
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs font-medium">Rating</span>
                <StarRatingInput value={rating} onChange={setRating} disabled={saving} />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-medium" htmlFor="review-title">
                  Title <span className="font-normal">(optional)</span>
                </label>
                <Input
                  id="review-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="Short summary"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-medium" htmlFor="review-body">
                  Review <span className="font-normal">(optional)</span>
                </label>
                <Textarea
                  id="review-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={4000}
                  placeholder="What did you think?"
                  disabled={saving}
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : myReview ? "Save changes" : "Post review"}
                </Button>
                {myReview ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => {
                      setEditing(false);
                      setRating(myReview.rating);
                      setTitle(myReview.title ?? "");
                      setBody(myReview.body ?? "");
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
              <p className="text-muted-foreground text-xs">One review per product per account.</p>
            </form>
          )}
        </div>
      ) : (
        <div className="bg-muted/20 border-border rounded-lg border px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Sign in
            </Link>{" "}
            or{" "}
            <Link
              href={`/register?next=${encodeURIComponent(nextPath)}`}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              create an account
            </Link>{" "}
            to write a review.
          </p>
        </div>
      )}

      {reviews === undefined ? (
        <p className="text-muted-foreground text-sm">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-muted-foreground text-sm">No reviews yet — be the first to share your experience.</p>
      ) : others.length === 0 ? (
        <p className="text-muted-foreground text-sm">No other reviews yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border" role="list">
          {others.map((r) => (
            <li key={r._id} className="px-4 py-3 first:pt-3 last:pb-3">
              <StarRow rating={r.rating} />
              {r.title ? <p className="text-foreground mt-1 text-sm font-medium">{r.title}</p> : null}
              {r.body ? <p className="text-muted-foreground mt-1 text-sm whitespace-pre-line">{r.body}</p> : null}
              <p className="text-muted-foreground mt-1 text-xs">
                {new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
