import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import type { StampedEvent } from "#postgres/execution/definition.ts";
import type { journalExecution } from "#postgres/execution/fixture.ts";
import { ExecutionHistory } from "#postgres/execution/service.ts";

export const syncExecutionFixture = Effect.fn("ExecutionFixture.sync")(function* (snapshot: Effect.Success<ReturnType<typeof journalExecution>>) {
	const history = yield* ExecutionHistory;
	const recorded = new Set((yield* history.read()).map((event) => event.requestId));
	const batches: { requestId: Request; events: StampedEvent[] }[] = [];
	for (const event of snapshot.events) {
		if (recorded.has(event.requestId)) continue;
		const previous = batches.at(-1);
		if (previous?.requestId === event.requestId) previous.events.push(event.value);
		else batches.push({ requestId: event.requestId, events: [event.value] });
	}
	for (const batch of batches) yield* history.append(batch.requestId, batch.events);
	if (!recorded.has(`fixture:sequence:${snapshot.sequence}`))
		yield* history.append(Request.make(`fixture:sequence:${snapshot.sequence}`), [
			{ _tag: "ExecutionSequenceObserved", at: 0, sequence: snapshot.sequence },
		]);
});
