import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Observation } from "@antumbra/platform-vocabulary/change-host.ts";
import { Effect, Schema } from "effect";
import { claimed, claimRows } from "#commands/claims.ts";
import { freshFeedback } from "#commands/feedback.ts";
import { Attachment, selectObservation } from "#commands/observation.ts";
import { observeRow } from "#commands/observe-row.ts";
import { changeObserved } from "#facts/change-observed.ts";
import { change } from "#rows/change.ts";
import { changeFeedback } from "#rows/change-feedback.ts";
import { changeTransition } from "#rows/change-transition.ts";
export const observe = command("observe", {
	input: { host: Schema.String, observation: Observation, attachment: Attachment, observedAt: Schema.String },
	reads: [change, changeTransition, changeFeedback, repo, ...claimRows],
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
		if (selected.row === undefined) return { change: null, transition: null, feedback: [] };
		const held = yield* rows.changeFeedback.where({ changeId: selected.row.id });
		const observed = yield* observeRow(selected.row, seen, input.observedAt, rows);
		return { ...observed, feedback: freshFeedback(selected.row.id, seen, held) };
	}),
});
