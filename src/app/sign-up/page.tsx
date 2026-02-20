"use client";

import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import { AuthField } from "@/components/auth-field";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { User, Mail, Lock, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller } from "react-hook-form";

export default function SignUpPage() {
  const router = useRouter();
  const { setSessionToken } = useAuth();
  const register = useMutation(api.users.register);
  const [submitError, setSubmitError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: SignUpInput) {
    setSubmitError("");
    try {
      const result = await register({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
        phone: data.phone?.trim() || undefined,
      });
      setSessionToken(result.sessionToken);
      router.push("/");
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Sign up failed");
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
            Create an account to get started.
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
            Create an account
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Enter your details to get started.
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
              name="name"
              control={control}
              render={({ field }) => (
                <AuthField
                  id="name"
                  label="Name"
                  type="text"
                  icon={<User />}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Your name"
                  autoComplete="name"
                  error={errors.name?.message}
                />
              )}
            />

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
              name="phone"
              control={control}
              render={({ field }) => (
                <AuthField
                  id="phone"
                  label="Phone (optional)"
                  type="text"
                  icon={<Phone />}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="+1 234 567 8900"
                  autoComplete="tel"
                  error={errors.phone?.message}
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
                  autoComplete="new-password"
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <AuthField
                  id="confirmPassword"
                  label="Confirm password"
                  type="password"
                  icon={<Lock />}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[#5c4033] text-[#f5f0e8] font-medium py-3 px-4 hover:bg-[#4a3328] focus:outline-none focus:ring-2 focus:ring-[#5c4033] focus:ring-offset-2 disabled:opacity-50 transition-colors dark:bg-[#8b6914] dark:text-[#f5f0e8] dark:hover:bg-[#7a5c12] dark:focus:ring-[#8b6914]"
            >
              {isSubmitting ? "Creating account…" : "Sign up"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
