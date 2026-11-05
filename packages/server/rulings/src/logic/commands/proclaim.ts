import type * as Source from "@antumbra/domain-rulings/commands/proclaim.ts";
import { RulingId } from "@antumbra/domain-rulings/ids.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import type { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
import { missingSubject } from "#logic/commands/request.ts";
export const proclaim = Effect.fn("rulings.proclaim")(function* (
	input: typeof Source.proclaim.Input.Type,
	reject: typeof Source.proclaim.reject,
): Effect.fn.Return<typeof Source.proclaim.emits.Payload.Type, RejectedBy<typeof Source.proclaim.rejections>, Records> {
	const missing = yield* missingSubject(input.subjects);
	if (missing !== null) return yield* reject.SubjectMissing({ subject: missing });
	if (input.by === "captain" && input.radius === "fleet") return yield* reject.OutsideAuthority({ radius: input.radius });
	if (input.chosenChoice !== null && !input.choices.some((choice) => choice.label === input.chosenChoice))
		return yield* reject.ChoiceUnknown({ choice: input.chosenChoice });
	return {
		id: RulingId.make(input.requestId),
		...input,
		subjects: [
			...input.subjects,
			...input.tags
				.split(",")
				.map((tag) => tag.trim())
				.filter((tag) => tag !== "")
				.map((tag) => ({ kind: "tag" as const, tag })),
		],
	};
});
