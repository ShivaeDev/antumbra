import type { RulingAuthority } from "@antumbra/vocabulary/ruling";
import { Effect, Option } from "effect";
import type { RulingVerdict } from "#acts.ts";
import { APPROVE } from "#approval-choices.ts";
import { standingApprovalRows } from "#approval-rows.ts";
import { ApprovalChoiceRequired } from "#errors.ts";
import type { Ruling } from "#model.ts";
import { invalidRulingValue } from "#stored.ts";
import { markSuperseded } from "#supersession-row.ts";

export const admitsApprovalVerdict = (open: Ruling, input: RulingVerdict) =>
	open.kind === "approval" && input.choiceId === undefined ? new ApprovalChoiceRequired({ rulingId: open.id }) : Effect.void;

const voyageOf = (approval: Ruling) => {
	const subject = approval.subjects.find((candidate) => candidate.kind === "voyage");
	return subject === undefined || subject.kind === "tag"
		? Effect.fail(invalidRulingValue("voyage subject", approval.id, approval.subjects))
		: Effect.succeed(subject.id);
};

const answeredApprove = (approval: Ruling): boolean =>
	Option.exists(approval.answer, (answer) =>
		Option.exists(answer.choiceId, (choiceId) => approval.choices.some((choice) => choice.id === choiceId && choice.label === APPROVE)),
	);

export const supersedePreviousApproval = (approved: Ruling, by: RulingAuthority, at: Date) =>
	Effect.gen(function* () {
		if (approved.kind !== "approval" || !answeredApprove(approved)) {
			return;
		}
		const previous = (yield* standingApprovalRows(yield* voyageOf(approved))).filter((row) => row.id !== approved.id);
		yield* Effect.forEach(previous, (row) => markSuperseded(row.id, { by, byRulingId: approved.id }, at));
	});
