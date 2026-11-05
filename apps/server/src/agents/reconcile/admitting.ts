import { pending } from "@antumbra/domain-agents/queries/pending.ts";
import { type birth, bornAs } from "@antumbra/domain-agents/rows/birth.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { derive, Request } from "@antumbra/platform-vocabulary/id.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Backends } from "@antumbra/server-backends/service.ts";
import { RoleSettings } from "@antumbra/server-role-settings/service.ts";
import { Voyages } from "@antumbra/server-voyages/service.ts";
import { run } from "@shivaedev/reconciler/run.ts";
import { Effect, Schema } from "effect";
import { watchKeys } from "#supervision/keys.ts";

const isBackend = Schema.is(AgentBackendTagSchema);

const waitingFor = (backend: string, failure: string | null): string => {
	const waiting = `waiting for ${backend} to list its models`;
	return failure === null ? waiting : `${waiting}: ${failure}`;
};

const DELAY_REFUSALS = { AlreadyDone: () => Effect.void, Unavailable: () => Effect.void };

const ADMIT_REFUSALS = {
	AlreadyDone: () => Effect.void,
	Held: () => Effect.void,
	NoSlot: () => Effect.void,
	NotEligible: () => Effect.void,
	NotOldest: () => Effect.void,
	NotRequested: () => Effect.void,
	Unknown: () => Effect.void,
};

const sayWaiting = Effect.fn("Agents.sayWaiting")(function* (held: typeof birth.Row.Type, backend: string) {
	const backendsService = yield* Backends;
	const agentsService = yield* Agents;

	const listing = isBackend(backend) ? yield* backendsService.catalog({ backend }).pipe(Effect.orDie) : null;
	const reason = waitingFor(backend, listing?.failure ?? null);
	if (held.detail === reason) return;
	yield* agentsService.delay({ id: held.id, reason, requestId: Request.make(derive(held.id, reason)) }).pipe(Effect.catchTags(DELAY_REFUSALS));
});

export const admitting = Effect.fn("Agents.admitting")(function* () {
	const agentsService = yield* Agents;

	return yield* run({
		keys: watchKeys(pending.reads, undefined),
		read: agentsService.pending({}).pipe(Effect.orDie),
		act: Effect.fn("Agents.admitting")(function* (rows) {
			const voyagesService = yield* Voyages;
			const roleSettingsService = yield* RoleSettings;
			const agentsService = yield* Agents;

			for (const held of rows) {
				const voyage = held.voyageId === null ? null : yield* voyagesService.byId({ id: held.voyageId }).pipe(Effect.orDie);
				const settings = yield* roleSettingsService.resolve({ voyageId: held.voyageId, role: bornAs(held, voyage) }).pipe(Effect.orDie);
				const backend = held.backend ?? settings.backend.value;
				const model = held.model ?? settings.model.value;
				if (model === null) {
					yield* sayWaiting(held, backend);
					continue;
				}
				yield* agentsService
					.admit({
						id: held.id,
						backend,
						model,
						effort: held.effort ?? settings.effort.value,
						requestId: Request.make(`admit:${held.operationRequestId}`),
					})
					.pipe(Effect.catchTags(ADMIT_REFUSALS));
			}
		}),
	});
});
