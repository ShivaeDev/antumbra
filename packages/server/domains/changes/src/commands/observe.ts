import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { Observation } from "@antumbra/platform-change-host/schema.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { claimed, claimRows } from "#claims.ts";
import { changeObserved } from "#facts/change-observed.ts";
import { Attachment, selectObservation } from "#observation.ts";
import { observeRow } from "#observe-row.ts";
import { change } from "#rows/change.ts";
import { changeTransition } from "#rows/change-transition.ts";
export const observe = command("observe", {
	input: { host: Schema.String, observation: Observation, attachment: Attachment, observedAt: Schema.String },
	reads: [change, changeTransition, repo, ...claimRows],
	emits: changeObserved,
	rejections: {
		ChangeIdentityCollision: { externalId: Schema.String },
		ChangeObservationConflict: { externalId: Schema.String },
		ResourceClaimed: { source: Schema.String },
	},
	run: Effect.fn("changes.observe")(function* (input, rows, reject) {
		const seen = input.observation;
		const repository = (yield* rows.repo.where({})).find((row) => row.id === seen.repoId);
		if (
			repository !== undefined &&
			(yield* claimed(rows, input.attachment._tag === "Claimed" ? input.attachment.agentId : null, repository.source, seen.headRef))
		)
			return yield* reject.ResourceClaimed({ source: repository.source });
		const selected = selectObservation(yield* rows.change.where({}), input.host, seen, input.attachment);
		if (selected._tag === "Collision") return yield* reject.ChangeIdentityCollision({ externalId: seen.externalId });
		if (selected._tag === "Conflict") return yield* reject.ChangeObservationConflict({ externalId: seen.externalId });
		return selected.row === undefined ? { change: null, transition: null } : yield* observeRow(selected.row, seen, input.observedAt, rows);
	}),
});
