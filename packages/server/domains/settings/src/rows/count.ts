import { row } from "@antumbra/feature/row.ts";
import { Schema } from "effect";
import { CountKey } from "#ids.ts";

export const count = row("count", { key: CountKey, scope: Schema.String, count: Schema.Number }, { key: "key", scope: "scope" });
