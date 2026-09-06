import { row } from "@antumbra/journal";
import { Schema } from "effect";
import { PieceId, VoyageId } from "#example/ids.ts";

export const piece = row(
	"piece",
	{
		id: PieceId,
		voyageId: VoyageId,
		title: Schema.String,
		status: Schema.Literals(["chartered", "launched", "parked", "landed"]),
		parkedReason: Schema.NullOr(Schema.String),
	},
	{ key: "id", scope: "voyageId" },
);
