import { z } from "zod";
import type { Sentiment } from "../types";

export const CLASSIFICATION_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          relevant: { type: "boolean" },
          sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
          rationale: { type: "string" },
        },
        required: ["id", "relevant", "sentiment", "rationale"],
      },
    },
  },
  required: ["items"],
} as const;

export const resultSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      relevant: z.boolean(),
      sentiment: z.enum(["positive", "negative", "neutral"]),
      rationale: z.string().default(""),
    }),
  ),
});

export interface Classification {
  id: string;
  relevant: boolean;
  sentiment: Sentiment;
  rationale: string;
}
