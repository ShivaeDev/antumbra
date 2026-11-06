import { Effect } from "effect";
import type { State } from "#state.ts";

export const attached = (state: State) => Effect.fn("RunnerFabric.attached")(() => Effect.sync(() => new Set(state.attachments.keys())));
