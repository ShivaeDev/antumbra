import { row } from "@antumbra/feature/row.ts";
import { Schema } from "effect";
import { FlagKey } from "#ids.ts";

export const flag = row("flag", { key: FlagKey, scope: Schema.String, on: Schema.Boolean }, { key: "key", scope: "scope" });
