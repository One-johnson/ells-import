"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  {
    question: "Where do you ship?",
    answer: "We currently ship within the United States. We're exploring international shipping and will announce when it's available.",
  },
  {
    question: "How long does delivery take?",
    answer: "Standard delivery is 5–7 business days. Express options may be available at checkout for faster delivery.",
  },
  {
    question: "What is your return policy?",
    answer: "We offer a 30-day hassle-free return window on most items. Products must be unused and in original packaging. See our Support page for full details.",
  },
  {
    question: "How can I track my order?",
    answer: "Once your order ships, you'll receive an email with a tracking link. You can also view order status and tracking in your Account under Orders.",
  },
  {
    question: "Do you offer wholesale or bulk orders?",
    answer: "Yes. For wholesale or bulk inquiries, please reach out via our Contact page and we'll get back to you within 1–2 business days.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function AboutContent() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
            src="https://placehold.co/1200x500/e8e0d5/5c4033?text=Ell's+Import"
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
              About Us
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-2 max-w-md text-lg text-white/90"
            >
              Quality imports, delivered to your door.
            </motion.p>
          </div>
        </div>
      </motion.section>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="space-y-10"
        >
          <motion.section variants={item} className="prose prose-neutral dark:prose-invert max-w-none">
            <h2 className="text-xl font-semibold text-foreground mb-3">Our story</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ell&apos;s Import was founded to bring carefully curated products from around the world to your doorstep. We work with trusted suppliers to offer quality goods at fair prices, with a focus on reliability and customer satisfaction.
            </p>
          </motion.section>

          <motion.section variants={item} className="prose prose-neutral dark:prose-invert max-w-none">
            <h2 className="text-xl font-semibold text-foreground mb-3">What we offer</h2>
            <p className="text-muted-foreground leading-relaxed">
              From everyday essentials to unique finds, we aim to make international shopping simple. Fast shipping, easy returns, and friendly support are at the heart of what we do.
            </p>
          </motion.section>

          <motion.section variants={item} className="prose prose-neutral dark:prose-invert max-w-none">
            <h2 className="text-xl font-semibold text-foreground mb-3">Get in touch</h2>
            <p className="text-muted-foreground leading-relaxed">
              Have questions or feedback? We&apos;d love to hear from you. Visit our{" "}
              <Link href="/contact" className="text-[#5c4033] hover:underline dark:text-[#c9a227]">
                Contact
              </Link>{" "}
              or{" "}
              <Link href="/support" className="text-[#5c4033] hover:underline dark:text-[#c9a227]">
                Support
              </Link>{" "}
              page to reach us.
            </p>
          </motion.section>
        </motion.div>

        {/* FAQs */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="mt-16 pt-14 border-t border-border"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={cn("size-5 shrink-0 text-muted-foreground transition-transform", openIndex === index && "rotate-180")}
                  />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openIndex === index ? "auto" : 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-border">
                    {faq.answer}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.section>

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
