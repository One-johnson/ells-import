import type { Metadata } from "next";
import { AboutContent } from "./about-content";

export const metadata: Metadata = {
  title: "About Us | Ell's Import",
  description: "Learn about Ell's Import – quality imports, delivered to your door.",
};

export default function AboutPage() {
  return <AboutContent />;
}
