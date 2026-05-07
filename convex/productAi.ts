import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

type ChatMessage =
  | { role: "system"; content: string }
  | {
      role: "user";
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    };

function buildUserPrompt(args: {
  name: string;
  sku?: string;
  categoryName?: string;
  priceLabel: string;
  existingDescription?: string;
}): string {
  const lines: string[] = [
    "Return JSON only (object with keys \"name\" and \"specs\") for an import/wholesale storefront.",
  ];
  if (args.name.trim()) {
    lines.push(`Current product name (refine for clarity and length; keep the same product): ${args.name.trim()}`);
  } else {
    lines.push(
      "No product name yet—propose a concise, accurate storefront title from the image, category, SKU, and price. Do not invent brand names or model numbers you cannot see or infer safely.",
    );
  }
  lines.push(`Price: ${args.priceLabel}`);
  if (args.categoryName) {
    lines.push(`Category: ${args.categoryName}`);
  }
  if (args.sku?.trim()) {
    lines.push(`SKU: ${args.sku.trim()}`);
  }
  if (args.existingDescription?.trim()) {
    lines.push(
      `Existing specs (rewrite into clearer bullets; keep every factual detail): ${args.existingDescription.trim()}`,
    );
  }
  lines.push(
    'JSON shape: {"name":"string","specs":"string"}. name: storefront title, max 100 characters, plain text. specs: bullet specifications only—each line must start with "• " then one fact; plain text, no markdown headers; 4–10 bullets; neutral technical tone; do not invent measurements, certifications, or health claims—only what you can infer from the inputs or clearly visible image details; stay under 1200 characters for specs.',
  );
  return lines.join("\n");
}

function parseNameAndSpecs(raw: string): { name: string; specs: string } {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "").trim();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(s) as unknown;
  } catch {
    throw new Error("Could not parse AI response as JSON. Try again.");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid AI response shape.");
  }
  const o = parsed as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const specs = typeof o.specs === "string" ? o.specs.trim() : "";
  if (!name || !specs) {
    throw new Error("AI returned empty name or specs.");
  }
  return { name, specs };
}

export const generateProductDescription = action({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    sku: v.optional(v.string()),
    categoryName: v.optional(v.string()),
    priceCents: v.number(),
    currency: v.string(),
    existingDescription: v.optional(v.string()),
    /** Resolved HTTPS URL when already known (e.g. client preview). */
    primaryImageUrl: v.optional(v.string()),
    /** First product image in storage—resolved inside the action for bulk flows. */
    primaryImageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(api.auth.me, { sessionToken: args.sessionToken });
    if (!me?.user || me.user.role !== "admin") {
      throw new Error("Admin only");
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it in the Convex dashboard under Settings → Environment Variables.",
      );
    }

    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

    let imageUrl = args.primaryImageUrl?.trim() ?? "";
    if (!imageUrl && args.primaryImageStorageId) {
      const u = await ctx.runQuery(api.files.getUrl, { storageId: args.primaryImageStorageId });
      imageUrl = u?.trim() ?? "";
    }

    const hasContext =
      args.name.trim().length > 0 ||
      Boolean(args.sku?.trim()) ||
      Boolean(args.categoryName?.trim()) ||
      Boolean(imageUrl);
    if (!hasContext) {
      throw new Error(
        "Add a name, image, SKU, or category so the model has context—or enter a draft name.",
      );
    }

    const priceLabel = `${(args.priceCents / 100).toFixed(2)} ${args.currency}`;
    const promptText = buildUserPrompt({
      name: args.name,
      sku: args.sku,
      categoryName: args.categoryName,
      priceLabel,
      existingDescription: args.existingDescription,
    });

    const userContent: ChatMessage["content"] =
      imageUrl &&
      (imageUrl.startsWith("https://") || imageUrl.startsWith("http://"))
        ? [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: imageUrl } },
          ]
        : promptText;

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          'You respond with valid JSON only: one object with exactly two string fields, "name" and "specs". No markdown fences, no extra keys, no commentary.',
      },
      { role: "user", content: userContent },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 900,
        temperature: 0.6,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let detail = errText;
      try {
        const j = JSON.parse(errText) as { error?: { message?: string } };
        if (j.error?.message) {
          detail = j.error.message;
        }
      } catch {
        /* keep raw */
      }
      throw new Error(`OpenAI error (${res.status}): ${detail.slice(0, 280)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      throw new Error("No response returned from the model.");
    }

    const { name, specs } = parseNameAndSpecs(raw);
    return {
      name: name.slice(0, 200),
      description: specs.slice(0, 4000),
    };
  },
});
