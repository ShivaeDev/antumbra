import { resolve } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { byId } from "@antumbra/domain-voyages/queries/by-id.ts";
import { reconciler } from "@antumbra/platform-feature/reconciler.ts";
import type { AgentRole } from "@antumbra/platform-vocabulary/agent-role.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { admit } from "#commands/admit.ts";
import { pending } from "#queries/pending.ts";

export const admitting = reconciler("admitting", {
	watch: pending,
	ports: [],
	run: Effect.fn("Agents.admitting")(function* (rows, reconciling) {
		for (const held of rows) {
			let role: AgentRole = held.role === "smoother" ? "smoother" : "crew";
			if (held.role === "captain" && held.pieceId === null && held.voyageId !== null) {
				const voyage = yield* reconciling.read(byId, { id: held.voyageId });
				role = voyage?.kind === "flagship" ? "flagship" : "captain";
			}
			const settings = yield* reconciling.read(resolve, { voyageId: held.voyageId, role });
			yield* reconciling
				.commit(admit, {
					id: held.id,
					backend: held.backend ?? settings.backend,
					model: held.model ?? settings.model,
					effort: held.effort ?? settings.effort,
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
