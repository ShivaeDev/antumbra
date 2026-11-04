import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import type { StampedEvent } from "#postgres/execution/definition.ts";
import type { State } from "#postgres/execution/state.ts";
import { locked } from "#postgres/execution/write.ts";

export const restore = (state: State) =>
	Effect.fn("ExecutionHistory.restore")(function* (
		batches: readonly {
			readonly requestId: Request;
			readonly events: readonly StampedEvent[];
		}[],
	) {
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
