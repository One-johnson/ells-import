"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { useRef, useState } from "react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export default function RegisterPage() {
  const { register, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const generateRegUpload = useMutation(api.files.generateRegistrationUploadUrl);

  const busy = authLoading || pending;

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be 2MB or smaller.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      let profileImageId: Id<"_storage"> | undefined;
      if (photoFile) {
        const postUrl = await generateRegUpload({});
        const res = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": photoFile.type || "application/octet-stream" },
          body: photoFile,
        });
        if (!res.ok) {
          throw new Error("Could not upload profile photo.");
        }
        const data = (await res.json()) as { storageId: Id<"_storage"> };
        profileImageId = data.storageId;
      }
      await register(
        email,
        password,
        name.trim() ? name.trim() : undefined,
        profileImageId,
      );
      const dest = next.startsWith("/") ? next : "/";
      router.push(dest);
      router.refresh();
    } catch {
      /* Error shown via sonner in AuthProvider */
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          Create an account to shop, save a cart, and track orders.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <span className="text-sm font-medium">Profile photo (optional)</span>
            <div className="flex flex-wrap items-center gap-3">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob preview URL
                <img
                  src={photoPreview}
                  alt=""
                  className="border-border size-14 rounded-full border object-cover"
                />
              ) : (
                <div className="border-border bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full border text-xs">
                  —
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  Upload
                </Button>
                {photoPreview ? (
                  <Button type="button" variant="ghost" size="sm" onClick={clearPhoto}>
                    Remove
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPhotoChange}
              />
            </div>
            <p className="text-muted-foreground text-xs">PNG or JPG, up to 2MB.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="name">
              Name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="text-muted-foreground text-xs">At least 8 characters.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {pending ? "Creating…" : "Create account"}
          </Button>
          <p className="text-muted-foreground text-center text-sm sm:text-right">
            Already have an account?{" "}
            <Link
              className="text-primary font-medium underline-offset-4 hover:underline"
              href={next && next.startsWith("/") ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
