import { resolve } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { byId } from "@antumbra/domain-voyages/queries/by-id.ts";
import { reconciler } from "@antumbra/platform-feature/reconciler.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { admit } from "#commands/admit.ts";
import { pending } from "#queries/pending.ts";
import { bornAs } from "#rows/birth.ts";

export const admitting = reconciler("admitting", {
	watch: pending,
	ports: [],
	run: Effect.fn("Agents.admitting")(function* (rows, reconciling) {
		for (const held of rows) {
			const voyage = held.voyageId === null ? null : yield* reconciling.read(byId, { id: held.voyageId });
			const settings = yield* reconciling.read(resolve, { voyageId: held.voyageId, role: bornAs(held, voyage) });
			const model = held.model ?? settings.model.value;
			if (model === null) continue;
			yield* reconciling
				.commit(admit, {
					id: held.id,
					backend: held.backend ?? settings.backend.value,
					model,
					effort: held.effort ?? settings.effort.value,
					requestId: Request.make(`admit:${held.operationRequestId}`),
				})
				.pipe(
					Effect.catchTags({
						AlreadyDone: () => Effect.void,
						Unknown: () => Effect.void,
						NotRequested: () => Effect.void,
						Held: () => Effect.void,
						NoSlot: () => Effect.void,
						NotEligible: () => Effect.void,
						NotOldest: () => Effect.void,
					}),
				);
		}
	}),
});
