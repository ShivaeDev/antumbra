import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { PieceVerdict } from "@antumbra/platform-vocabulary/verdict.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";

export const piece = row(
	"piece",
	{
		id: PieceId,
		voyageId: VoyageId,
		title: Schema.String,
		charter: Schema.String,
		expectation: Schema.String,
		role: Schema.String,
		launchedAt: Schema.NullOr(Schema.String),
		parkedAt: Schema.NullOr(Schema.String),
		verdict: Schema.NullOr(PieceVerdict),
		charteredAt: Schema.String,
	},
	{ key: "id", scope: "voyageId" },
);
