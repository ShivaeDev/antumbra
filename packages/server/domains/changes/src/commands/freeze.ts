import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { claimed, claimRows, ownerAvailable } from "#commands/claims.ts";
import { proposalFrozen } from "#facts/proposal-frozen.ts";
import { ChangeId } from "#ids.ts";
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
	run: Effect.fn("changes.freeze")(function* (input, rows, reject) {
		if (!(yield* rows.change.exists(input.changeId))) return yield* reject.UnknownChange({ id: input.changeId });
		const held = yield* rows.change.get(input.changeId);
		if (held.openedByAgentId !== null && !(yield* ownerAvailable(rows, held.openedByAgentId)))
			return yield* reject.ResourceOwnerUnavailable({ agentId: held.openedByAgentId });
		const repository = yield* rows.repo.get(held.repoId);
		if (yield* claimed(rows, held.openedByAgentId, repository.source, held.headRef))
			return yield* reject.ResourceClaimed({ agentId: held.openedByAgentId ?? "" });
		const frozen =
			held.proposalFrozenAt !== null || held.stage !== "prepared"
				? held
				: {
						...held,
						title: input.title,
						body: input.body,
						baseRef: input.base ?? repository.defaultRef,
						draftAt: input.draft ? input.at : null,
						proposalFrozenAt: input.at,
					};
		return { change: frozen.stage !== "prepared" ? frozen : { ...frozen, publicationRequestId: input.requestId, publicationError: null } };
	}),
});
