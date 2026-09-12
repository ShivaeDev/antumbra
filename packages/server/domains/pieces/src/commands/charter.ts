import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { choice, many, titled } from "@antumbra/platform-feature/edit.ts";
import { Clock, Effect, Schema } from "effect";
import { DEPENDS_ON, WOULD_CYCLE, wiring } from "#commands/wiring.ts";
import { pieceChartered } from "#facts/piece-chartered.ts";
import { PieceId } from "#ids.ts";
import { byVoyage } from "#queries/by-voyage.ts";
import { pieceEdge } from "#rows/piece-edge.ts";
import { piece } from "#rows/piece.ts";

const NEEDED: readonly { readonly field: "charter" | "role" | "title"; readonly message: string }[] = [
	{ field: "title", message: "A piece needs a title" },
	{ field: "charter", message: "A piece needs a charter" },
	{ field: "role", message: "A piece needs a role" },
];

export const charter = command("charter", {
	input: {
		voyageId: VoyageId,
		title: titled(Schema.String, { title: "Title" }),
		charter: titled(Schema.String, { multiline: true, title: "Charter" }),
		expectation: titled(Schema.String, { title: "Expectation" }),
		role: titled(Schema.String, { title: "Role" }),
		dependsOn: titled(many(choice(byVoyage, { input: { voyageId: "voyageId" }, label: "title", value: "id" })), { title: "Depends on" }),
	},
	reads: [voyage, piece, pieceEdge],
	emits: pieceChartered,
	rejections: {
		Blank: { field: Schema.String, message: Schema.String },
		UnknownVoyage: { voyageId: Schema.String },
		UnknownDependency: { pieceId: Schema.String },
		WouldCycle: { field: Schema.String, from: Schema.String, message: Schema.String, to: Schema.String },
	},
	run: Effect.fn("pieces.charter")(function* (input, rows, reject) {
		const said = { charter: input.charter.trim(), expectation: input.expectation, role: input.role.trim(), title: input.title.trim() };
		for (const needed of NEEDED) {
			if (said[needed.field] === "") {
				return yield* reject.Blank({ field: needed.field, message: needed.message });
			}
		}
		if (!(yield* rows.voyage.exists(input.voyageId))) {
			return yield* reject.UnknownVoyage({ voyageId: input.voyageId });
		}
		const id = PieceId.make(input.requestId);
		const wired = yield* wiring(rows, id, input.dependsOn);
		if (wired._tag === "Unknown") {
			return yield* reject.UnknownDependency({ pieceId: wired.pieceId });
		}
		if (wired._tag === "Cycle") {
			return yield* reject.WouldCycle({ field: DEPENDS_ON, from: wired.from, message: WOULD_CYCLE, to: wired.to });
		}
		const at = yield* Clock.currentTimeMillis;
		return { ...said, charteredAt: new Date(at).toISOString(), dependsOn: wired.dependsOn, id, voyageId: input.voyageId };
	}),
});
