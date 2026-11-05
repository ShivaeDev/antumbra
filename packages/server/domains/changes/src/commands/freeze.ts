import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { ChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { Schema } from "effect";
import { claimRows } from "#commands/claims.ts";
import { proposalFrozen } from "#facts/proposal-frozen.ts";
import { change } from "#rows/change.ts";
export const freeze = command("freeze", {
	input: {
		changeId: ChangeId,
		title: Schema.String,
		body: Schema.String,
		base: Schema.NullOr(Schema.String),
		draft: Schema.Boolean,
		at: Schema.String,
	},
	reads: [change, repo, ...claimRows],
	emits: proposalFrozen,
	rejections: {
		ResourceOwnerUnavailable: { agentId: Schema.String },
		UnknownChange: { id: Schema.String },
		ResourceClaimed: { agentId: Schema.String },
	},
});
