import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { VoyageId } from "#ids.ts";

export const voyagePieceProgress = row(
	"voyagePieceProgress",
	{
		id: Schema.String,
		voyageId: VoyageId,
		state: Schema.Literals(["abandoned", "active", "blocked", "done", "held", "landing", "parked", "ready"]),
		lastStirredAt: Schema.NullOr(Schema.String),
		concluded: Schema.Boolean,
	},
	{ key: "id", scope: "voyageId" },
);
