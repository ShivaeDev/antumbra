import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Observation } from "@antumbra/platform-vocabulary/change-host.ts";
import { Schema } from "effect";
import { claimRows } from "#commands/claims.ts";
import { Attachment } from "#commands/observation.ts";
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
});
