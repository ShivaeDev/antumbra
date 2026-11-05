import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import type { StampedEvent } from "#execution/definition.ts";
import { ExecutionStore } from "#execution/state.ts";
import { locked } from "#execution/write.ts";

export const restore = Effect.fn("ExecutionHistory.restore")(function* (
	batches: readonly {
		readonly requestId: Request;
		readonly events: readonly StampedEvent[];
	}[],
) {
	const state = yield* ExecutionStore;
	return yield* locked(
		Effect.gen(function* () {
			const current = yield* state.store.read("execution");
			let version = current.at(-1)?.streamVersion ?? 0;
			for (const batch of batches)
				version = yield* state.store.append({ stream: "execution", requestId: batch.requestId, events: batch.events, expectedVersion: version });
			return version;
		}),
	);
});
