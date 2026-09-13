import { charter } from "@antumbra/domain-sessions/commands/charter.ts";
import { opening } from "@antumbra/domain-sessions/queries/opening.ts";
import { byId } from "@antumbra/domain-voyages/queries/by-id.ts";
import { reconciler } from "@antumbra/platform-feature/reconciler.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { hold } from "#commands/hold.ts";
import { Charter } from "#ports/charter.ts";
import { BirthHeld, Provisioning } from "#ports/provisioning.ts";
import { RunnerOperations } from "#ports/runner-operations.ts";
import { ToolCatalog } from "#ports/tool-catalog.ts";
import { admitted } from "#queries/admitted.ts";
import { bornAs } from "#rows/birth.ts";

export const executing = reconciler("executing", {
	watch: admitted,
	each: (held) => held.operationRequestId,
	ports: [Charter, Provisioning, RunnerOperations, ToolCatalog],
	run: Effect.fn("Agents.executing")(function* (held, reconciling) {
		const ports = reconciling.ports;
		const charterId = `${held.id}:charter`;
		const chartering = Effect.gen(function* () {
			const stored = yield* reconciling.read(opening, { id: held.sessionId });
			if (stored !== null) return stored;
			const composed = yield* ports.charter.compose(held);
			yield* reconciling
				.commit(charter, {
					requestId: Request.make(charterId),
					sessionId: held.sessionId,
					inputId: charterId,
					standingOrders: composed.constrainedPrompt,
					charter: composed.text,
				})
				.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
			const recorded = yield* reconciling.read(opening, { id: held.sessionId });
			if (recorded === null) return yield* Effect.die(new Error(`Session ${held.sessionId} kept no record of the charter it was given`));
			return recorded;
		});
		const handoff = Effect.gen(function* () {
			const runnerId = yield* ports.runnerOperations.runnerFor(held.backend);
			const requestId = Request.make(held.operationRequestId);
			const cwd = held.cwd ?? (yield* ports.provisioning.prepare(held.agentId, requestId, runnerId));
			const voyage = held.voyageId === null ? null : yield* reconciling.read(byId, { id: held.voyageId });
			const toolSet = yield* ports.toolCatalog.freeze(bornAs(held, voyage));
			const chartered = yield* chartering;
			const refused = yield* ports.runnerOperations.start(runnerId, {
				requestId: held.operationRequestId,
				sessionId: held.sessionId,
				agentId: held.agentId,
				backend: held.backend,
				cwd,
				model: held.model,
				effort: held.effort,
				constrainedPrompt: chartered.standingOrders,
				toolSet,
				charterId: chartered.inputId,
				charter: chartered.charter,
			});
			if (refused !== null) return yield* new BirthHeld({ reason: refused });
		});
		yield* handoff.pipe(
			Effect.catchTag("BirthHeld", (failure) =>
				reconciling
					.commit(hold, { requestId: Request.make(`${held.operationRequestId}:held`), id: held.id, reason: failure.reason })
					.pipe(Effect.catchTags({ AlreadyDone: () => Effect.void, Unavailable: () => Effect.void })),
			),
		);
	}),
});
