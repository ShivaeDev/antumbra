import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";

export const smoothingAttempt = row(
	"smoothingAttempt",
	{
		id: Schema.String,
		voyageId: VoyageId,
		pieceId: Schema.NullOr(PieceId),
		throughToday: Schema.Boolean,
		requestedAt: Schema.String,
		status: Schema.Literals(["requested", "succeeded", "failed"]),
		detail: Schema.NullOr(Schema.String),
	},
	{ key: "id", scope: "voyageId" },
);
