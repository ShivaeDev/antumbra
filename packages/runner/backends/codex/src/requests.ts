import type { BackendFailure } from "@antumbra/runner-ports/backend.ts";
import type { Effect } from "effect";

export type Request = (method: string, params: unknown, timeoutMs?: number) => Effect.Effect<unknown, BackendFailure>;
