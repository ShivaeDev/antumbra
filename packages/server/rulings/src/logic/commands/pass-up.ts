import type * as Source from "@antumbra/domain-rulings/commands/pass-up.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const passUp = Effect.fn("rulings.passUp")(function* (
	input: typeof Source.passUp.Input.Type,
	reject: typeof Source.passUp.reject,
): Effect.fn.Return<typeof Source.passUp.emits.Payload.Type, RejectedBy<typeof Source.passUp.rejections>, Records> {
	const rows = yield* Records;

	const found = yield* rows.ruling
		.findOne({ where: { id: input.rulingId }, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
	const current = found.value;
	if (current.answer !== null) return yield* reject.AlreadyRuled({ rulingId: input.rulingId });
	if (current.rung !== input.by) return yield* reject.NotAtRung({ rulingId: input.rulingId, rung: current.rung });
	if (input.note.trim() === "") return yield* reject.Blank({ field: "note", message: "Say what you know before passing a question up" });
	return input;
});
