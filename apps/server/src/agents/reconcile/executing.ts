import { Charter } from "@antumbra/domain-agents/ports/charter.ts";
import { BirthHeld, Provisioning } from "@antumbra/domain-agents/ports/provisioning.ts";
import { RunnerOperations } from "@antumbra/domain-agents/ports/runner-operations.ts";
import { ToolCatalog } from "@antumbra/domain-agents/ports/tool-catalog.ts";
import { admitted } from "@antumbra/domain-agents/queries/admitted.ts";
import { bornAs } from "@antumbra/domain-agents/rows/birth.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { Voyages } from "@antumbra/server-voyages/service.ts";
import { each } from "@shivaedev/reconciler/each.ts";
import { Effect } from "effect";
import { watchKeys } from "#supervision/keys.ts";

export const executing = Effect.fn("Agents.executing")(function* () {
	const agentsService = yield* Agents;
	const ports = {
		charter: yield* Charter,
		provisioning: yield* Provisioning,
		runnerOperations: yield* RunnerOperations,
		toolCatalog: yield* ToolCatalog,
	};
	return yield* each({
		keys: watchKeys(admitted.reads, undefined),
		read: agentsService.admitted({}).pipe(Effect.orDie),
		key: (held) => held.operationRequestId,
		act: Effect.fn("Agents.executing")(function* (held) {
			const agentsService = yield* Agents;

			const charterId = `${held.id}:charter`;
			const chartering = Effect.gen(function* () {
				const sessionsService = yield* Sessions;

				const stored = yield* sessionsService.opening({ id: held.sessionId }).pipe(Effect.orDie);
				if (stored !== null) return stored;
				const composed = yield* ports.charter.compose(held);
				yield* sessionsService
					.charter({
						requestId: Request.make(charterId),
						sessionId: held.sessionId,
						inputId: charterId,
						standingOrders: composed.constrainedPrompt,
						charter: composed.text,
					})
					.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
				const recorded = yield* sessionsService.opening({ id: held.sessionId }).pipe(Effect.orDie);
				if (recorded === null) return yield* Effect.die(new Error(`Session ${held.sessionId} kept no record of the charter it was given`));
				return recorded;
			});
			const handoff = Effect.gen(function* () {
				const voyagesService = yield* Voyages;

				const runnerId = yield* ports.runnerOperations.runnerFor(held.backend);
				const requestId = Request.make(held.operationRequestId);
				const cwd = held.cwd ?? (yield* ports.provisioning.prepare(held.agentId, requestId, runnerId));
				const voyage = held.voyageId === null ? null : yield* voyagesService.byId({ id: held.voyageId }).pipe(Effect.orDie);
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
					agentsService
						.hold({ requestId: Request.make(`${held.operationRequestId}:held`), id: held.id, reason: failure.reason })
						.pipe(Effect.catchTags({ AlreadyDone: () => Effect.void, Unavailable: () => Effect.void })),
				),
			);
		}),
	});
});
