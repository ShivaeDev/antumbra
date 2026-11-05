import type { Records } from "@antumbra/server-storage/records.ts";
import type { Effect } from "effect";
export type NativeRead = (input: unknown) => Effect.Effect<unknown, never, Records>;
