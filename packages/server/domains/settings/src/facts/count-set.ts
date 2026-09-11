import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { CountKey } from "#ids.ts";

export const countSet = fact("CountSet", { key: CountKey, count: Schema.Number });
