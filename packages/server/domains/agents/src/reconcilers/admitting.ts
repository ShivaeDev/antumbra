import { catalog } from "@antumbra/domain-backends/queries/catalog.ts";
import { resolve } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { byId } from "@antumbra/domain-voyages/queries/by-id.ts";
import { type Reconciling, reconciler } from "@antumbra/platform-feature/reconciler.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { derive, Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Schema } from "effect";
import { admit } from "#commands/admit.ts";
import { delay } from "#commands/delay.ts";
import { pending } from "#queries/pending.ts";
import { type birth, bornAs } from "#rows/birth.ts";

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

const sayWaiting = Effect.fn("Agents.sayWaiting")(function* (held: typeof birth.Row.Type, backend: string, reconciling: Reconciling<readonly []>) {
	const listing = isBackend(backend) ? yield* reconciling.read(catalog, { backend }) : null;
	const reason = waitingFor(backend, listing?.failure ?? null);
	if (held.detail === reason) return;
	yield* reconciling.commit(delay, { id: held.id, reason, requestId: Request.make(derive(held.id, reason)) }).pipe(Effect.catchTags(DELAY_REFUSALS));
});

export const admitting = reconciler("admitting", {
	watch: pending,
	ports: [],
	run: Effect.fn("Agents.admitting")(function* (rows, reconciling) {
		for (const held of rows) {
			const voyage = held.voyageId === null ? null : yield* reconciling.read(byId, { id: held.voyageId });
			const settings = yield* reconciling.read(resolve, { voyageId: held.voyageId, role: bornAs(held, voyage) });
			const backend = held.backend ?? settings.backend.value;
			const model = held.model ?? settings.model.value;
			if (model === null) {
				yield* sayWaiting(held, backend, reconciling);
				continue;
			}
			yield* reconciling
				.commit(admit, {
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
