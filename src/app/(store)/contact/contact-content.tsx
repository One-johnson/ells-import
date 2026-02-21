"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@/lib/validations/contact";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function ContactContent() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  function onSubmit(_data: ContactInput) {
    setSubmitted(true);
    toast.success("Message sent. We'll get back to you soon.");
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full overflow-hidden"
      >
        <div className="relative aspect-[21/9] w-full bg-muted sm:aspect-[3/1]">
          <Image
            src="https://placehold.co/1200x500/e8e0d5/5c4033?text=Get+in+Touch"
            alt=""
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center px-4 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl font-semibold tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl"
            >
              Contact
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-2 max-w-md text-lg text-white/90"
            >
              We&apos;d love to hear from you.
            </motion.p>
          </div>
        </div>
      </motion.section>

      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="space-y-8"
        >
          <motion.div variants={item}>
            <p className="text-muted-foreground leading-relaxed">
              Have questions, feedback, or a partnership idea? Use the form below or email us at{" "}
              <a
                href="mailto:hello@ellsimport.com"
                className="text-[#5c4033] hover:underline dark:text-[#c9a227] font-medium"
              >
                hello@ellsimport.com
              </a>
              . We typically respond within 1–2 business days.
            </p>
          </motion.div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-border bg-[#5c4033]/5 dark:bg-[#8b6914]/10 p-8 text-center"
            >
              <p className="text-lg font-medium text-foreground">Thank you for reaching out.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                We&apos;ve received your message and will get back to you soon.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-6"
                onClick={() => setSubmitted(false)}
              >
                Send another message
              </Button>
            </motion.div>
          ) : (
            <motion.form
              variants={item}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="contact-name" className="text-sm font-medium text-foreground">
                    Name
                  </label>
                  <Input
                    id="contact-name"
                    placeholder="Your name"
                    {...register("name")}
                    aria-invalid={!!errors.name}
                    className="h-10"
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="contact-email" className="text-sm font-medium text-foreground">
                    Email
                  </label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="you@example.com"
                    {...register("email")}
                    aria-invalid={!!errors.email}
                    className="h-10"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-subject" className="text-sm font-medium text-foreground">
                  Subject
                </label>
                <Input
                  id="contact-subject"
                  placeholder="What is this about?"
                  {...register("subject")}
                  aria-invalid={!!errors.subject}
                  className="h-10"
                />
                {errors.subject && (
                  <p className="text-xs text-destructive">{errors.subject.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-message" className="text-sm font-medium text-foreground">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  placeholder="Your message..."
                  {...register("message")}
                  aria-invalid={!!errors.message}
                  className={cn(
                    "w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground",
                    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
                    "disabled:pointer-events-none disabled:opacity-50 md:text-sm"
                  )}
                />
                {errors.message && (
                  <p className="text-xs text-destructive">{errors.message.message}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-[#5c4033] hover:bg-[#4a3328] dark:bg-[#8b6914] dark:hover:bg-[#7a5c12]"
              >
                {isSubmitting ? "Sending..." : "Send message"}
              </Button>
            </motion.form>
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12"
        >
          <Link
            href="/"
            className="text-sm font-medium text-[#5c4033] hover:underline dark:text-[#c9a227]"
          >
            ← Back to home
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
