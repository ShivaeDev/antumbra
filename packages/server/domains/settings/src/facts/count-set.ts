import { fact } from "@antumbra/feature/fact.ts";
import { Schema } from "effect";
import { CountKey } from "#ids.ts";

export const countSet = fact("CountSet", { key: CountKey, count: Schema.Number });
