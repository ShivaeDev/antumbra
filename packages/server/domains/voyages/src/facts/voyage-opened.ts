import { fact } from "@antumbra/platform-feature/fact.ts";
import { VoyageKindSchema } from "@antumbra/platform-vocabulary/voyage.ts";
import { Schema } from "effect";
import { VoyageId } from "#ids.ts";

const Chosen = Schema.Struct({
	backend: Schema.NullOr(Schema.String),
	model: Schema.NullOr(Schema.String),
	effort: Schema.NullOr(Schema.String),
});

export const voyageOpened = fact("VoyageOpened", {
	id: VoyageId,
	kind: VoyageKindSchema,
	name: Schema.String,
	northStar: Schema.String,
	context: Schema.String,
	openedAt: Schema.String,
	captain: Chosen,
	crew: Chosen,
});
