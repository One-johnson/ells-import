import { Truck, RefreshCw, ShieldCheck, Headphones } from "lucide-react";

const props = [
  {
    icon: Truck,
    title: "Free shipping",
    description: "On orders over GH₵500",
  },
  {
    icon: RefreshCw,
    title: "Easy returns",
    description: "30-day hassle-free returns",
  },
  {
    icon: ShieldCheck,
    title: "Secure payment",
    description: "Your data is protected",
  },
  {
    icon: Headphones,
    title: "Support",
    description: "We're here to help",
  },
] as const;

export function HomeValueProps() {
  return (
    <section className="border-y border-border bg-muted/20 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {props.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#5c4033]/10 text-[#5c4033] dark:bg-[#8b6914]/20 dark:text-[#c9a227]">
                <Icon className="size-6" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
