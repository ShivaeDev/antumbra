import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";

export const pieceChartered = fact("PieceChartered", {
	id: PieceId,
	voyageId: VoyageId,
	title: Schema.String,
	charter: Schema.String,
	expectation: Schema.String,
	role: Schema.String,
	dependsOn: Schema.Array(PieceId),
	charteredAt: Schema.String,
});
