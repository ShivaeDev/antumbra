import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { sessionCapacityWait } from "#rows/session-capacity-wait.ts";
import { sessionOperation } from "#rows/session-operation.ts";
export const capacityReleased = query("capacityReleased", {
	input: {},
	output: Schema.Array(sessionOperation.Row),
	reads: [sessionOperation, sessionCapacityWait, capacity],
	run: Effect.fn("Sessions.capacityReleased")(function* (_input, rows) {
		const providers = yield* rows.capacity.where({});
		const holds = yield* rows.sessionCapacityWait.where({});
		const waiting = yield* rows.sessionOperation.where({ status: "waiting" });
		return waiting.filter((operation) => {
			const hold = holds.find((held) => held.id === operation.id);
			return hold !== undefined && providers.some((provider) => provider.backend === hold.backend && provider.status !== "blocked");
		});
	}),
});
