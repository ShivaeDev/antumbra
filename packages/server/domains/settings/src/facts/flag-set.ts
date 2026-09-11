import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { FlagKey } from "#ids.ts";

export const flagSet = fact("FlagSet", { key: FlagKey, on: Schema.Boolean });
