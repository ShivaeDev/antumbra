import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option } from "effect";
import { rejections } from "#commands/guard.ts";
import { rulingGated } from "#facts/ruling-gated.ts";
import { ruling } from "#rows/ruling.ts";
export const gate = command("gate", {
	input: rulingGated.payload,
	reads: [ruling, piece],
	emits: rulingGated,
	rejections: { ...rejections, PieceMissing: { pieceId: PieceId } },
	run: Effect.fn("rulings.gate")(function* (input, rows, reject) {
		const found = yield* rows.ruling.find(input.rulingId);
		if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
		if (found.value.answer !== null) return yield* reject.AlreadyRuled({ rulingId: input.rulingId });
		for (const pieceId of input.pieceIds) if (!(yield* rows.piece.exists(pieceId))) return yield* reject.PieceMissing({ pieceId });
		return input;
	}),
});
