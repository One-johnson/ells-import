"use client";

import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import { AuthField } from "@/components/auth-field";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller } from "react-hook-form";
import { toast } from "sonner";

export default function SignInPage() {
  const router = useRouter();
  const { setSessionToken } = useAuth();
  const login = useMutation(api.users.login);
  const [submitError, setSubmitError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: SignInInput) {
    setSubmitError("");
    try {
      const result = await login({ email: data.email.trim(), password: data.password });
      setSessionToken(result.sessionToken);
      toast.success("Signed in successfully");
      router.push("/");
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Sign in failed");
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-muted/50 items-center justify-center p-12">
        <div className="max-w-sm text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/logo-source.png"
              alt="Ell's Import"
              width={200}
              height={80}
              className="object-contain mx-auto"
            />
          </Link>
          <p className="mt-6 text-muted-foreground text-sm">
            Quality imports, delivered to your door.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 sm:px-12 relative">
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-10">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden mb-8 text-center">
            <Link href="/">
              <Image
                src="/logo-source.png"
                alt="Ell's Import"
                width={160}
                height={64}
                className="object-contain mx-auto"
              />
            </Link>
          </div>

          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Sign in to your account to continue.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            {submitError && (
              <div
                role="alert"
                className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3"
              >
                {submitError}
              </div>
            )}

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <AuthField
                  id="email"
                  label="Email"
                  type="email"
                  icon={<Mail />}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <AuthField
                  id="password"
                  label="Password"
                  type="password"
                  icon={<Lock />}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={errors.password?.message}
                />
              )}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[#5c4033] text-[#f5f0e8] font-medium py-3 px-4 hover:bg-[#4a3328] focus:outline-none focus:ring-2 focus:ring-[#5c4033] focus:ring-offset-2 disabled:opacity-50 transition-colors dark:bg-[#8b6914] dark:text-[#f5f0e8] dark:hover:bg-[#7a5c12] dark:focus:ring-[#8b6914]"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
