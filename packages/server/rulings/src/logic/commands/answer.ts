import type * as Source from "@antumbra/domain-rulings/commands/answer.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const answer = Effect.fn("rulings.answer")(function* (
	input: typeof Source.answer.Input.Type,
	reject: typeof Source.answer.reject,
): Effect.fn.Return<typeof Source.answer.emits.Payload.Type, RejectedBy<typeof Source.answer.rejections>, Records> {
	const rows = yield* Records;

	const found = yield* rows.ruling
		.findOne({ where: { id: input.rulingId }, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
	const current = found.value;

	if (current.answer !== null) return yield* reject.AlreadyRuled({ rulingId: input.rulingId });
	const heights = { captain: 0, flagship: 1, admiral: 2 };
	if (current.rung !== null && heights[input.by] < heights[current.rung])
		return yield* reject.BelowRung({ rulingId: input.rulingId, rung: current.rung });
	if (input.by === "captain" && current.radius === "fleet")
		return yield* reject.OutsideAuthority({ rulingId: input.rulingId, radius: current.radius });
	if (input.choiceId !== null && !current.choices.some((choice) => choice.id === input.choiceId))
		return yield* reject.ChoiceUnknown({ rulingId: input.rulingId, choiceId: input.choiceId });
	if (input.answer.length === 0) return yield* reject.Blank({ field: "answer", message: "A ruling needs an answer" });

	return input;
});
