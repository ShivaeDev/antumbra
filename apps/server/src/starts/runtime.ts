import { admitted } from "@antumbra/domain-starts/queries/admitted.ts";
import { each } from "@antumbra/server-journal/reconcile.ts";
import { Effect } from "effect";
import { admission } from "#starts/admission.ts";
import { dispatching } from "#starts/dispatch.ts";
import { execute } from "#starts/execution.ts";
import { resting } from "#starts/rest.ts";

export const runtime = Effect.gen(function* () {
	const dispatch = yield* dispatching;
	const rest = yield* resting;
	const admitting = yield* admission;
	const executing = yield* each(admitted, {}, (birth) => birth.operationRequestId, execute);
	return {
		refresh: Effect.all([dispatch.refresh, rest.refresh, admitting.refresh, executing.refresh], { discard: true }),
		await: Effect.all([dispatch.await, rest.await, admitting.await, executing.await], { concurrency: "unbounded", discard: true }),
	};
});
