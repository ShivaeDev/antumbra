import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { rejections } from "#commands/guard.ts";
import { rulingGated } from "#facts/ruling-gated.ts";
import { ruling } from "#rows/ruling.ts";
export const gate = command("gate", {
	input: rulingGated.payload,
	reads: [ruling, piece],
	emits: rulingGated,
	rejections: { ...rejections, PieceMissing: { pieceId: PieceId } },
});
