import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { PieceId } from "@antumbra/platform-vocabulary/piece.ts";
import { VoyageId } from "@antumbra/platform-vocabulary/voyage.ts";
import { Effect } from "effect";
import { postgresApp } from "#postgres.ts";

export const reef = VoyageId.make("voyage:reef");
export const soundings = PieceId.make("piece:soundings");
export const opening = {
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
	context: "the reef is uncharted",
	kind: "voyage",
	name: "Chart the reef",
	northStar: "every shoal is known",
	requestId: Request.make(reef),
} as const;
export const chartering = {
	voyageId: reef,
	title: "Soundings",
	charter: "sound the eastern shoal",
	role: "hand",
	expectation: "the soundings are landed",
	dependsOn: [],
	requestId: Request.make(soundings),
};
export const hasChartedReef = postgresApp.trait("facts", "the reef has a chartered Piece", (engine) =>
	Effect.gen(function* () {
		yield* engine.api["voyages.open"](opening);
		yield* engine.api["pieces.charter"](chartering);
	}),
);
