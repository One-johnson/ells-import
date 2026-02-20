import type { Metadata } from "next";
import { ContactContent } from "./contact-content";

export const metadata: Metadata = {
  title: "Contact | Ell's Import",
  description: "Get in touch with Ell's Import – we're here to help.",
};

export default function ContactPage() {
  return <ContactContent />;
}
