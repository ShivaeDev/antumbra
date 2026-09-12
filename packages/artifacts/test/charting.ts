import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Pieces } from "@antumbra/pieces";
import { scriptedChart, scriptedPiecesOn } from "@antumbra/pieces/testing";
import { scriptedRoleSettings } from "@antumbra/settings/testing";
import { Voyages } from "@antumbra/voyages";
import { scriptedSailing, scriptedVoyagesOn } from "@antumbra/voyages/testing";
import { Effect, Layer } from "effect";

export const charting = scriptedPiecesOn(scriptedChart()).pipe(
	Layer.provideMerge(DomainFeedsLive),
	Layer.provideMerge(scriptedVoyagesOn(scriptedSailing())),
	Layer.provide(scriptedRoleSettings),
);

export const chartered = Effect.fnUntraced(function* (id: string, title: string) {
	const sailing = yield* Voyages;
	const voyage = yield* sailing.open({
		context: "the reef is uncharted",
		id: "voyage-reef",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	const pieces = yield* Pieces;
	yield* pieces.charter({
		charter: "draw the reef",
		dependsOn: [],
		expectation: "a chart lands",
		id,
		role: "cartographer",
		title,
		voyageId: voyage.id,
	});
});
