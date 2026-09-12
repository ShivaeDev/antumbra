import { prepareArtifactSource } from "@antumbra/app-testing/artifact-source.ts";
import { answered, it } from "@antumbra/app-testing/entry.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { ArtifactId } from "#ids.ts";
import { cartographer, chartering, landing, opening, pieceId } from "#test/kit.ts";

const old = ArtifactId.make("old");
const next = ArtifactId.make("next");
const edge = { supersededArtifactId: old, successorArtifactId: next, actorAgentId: cartographer };

it.app("correcting a replacement restores both artifacts", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* prepareArtifactSource({ seed: "agent:cartographer" });
	app.artifacts.source.set("old.md", "# Old soundings");
	app.artifacts.source.set("new.md", "# New soundings");
	yield* landing(old, "old.md");
	yield* landing(next, "new.md");
	yield* app.api.artifacts.supersede(edge);
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).history).toMatchObject([{ id: old }]);
	yield* app.api.artifacts.removeSupersession(edge);
	const current = yield* answered(app.api.artifacts.byPiece({ pieceId }));
	expect(current.current).toHaveLength(2);
	expect(current.history).toEqual([]);
});

it.app("refuses a cycle and an unrelated author's correction", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* prepareArtifactSource({ seed: "agent:cartographer" });
	app.artifacts.source.set("old.md", "# Old soundings");
	app.artifacts.source.set("new.md", "# New soundings");
	yield* landing(old, "old.md");
	yield* landing(next, "new.md");
	yield* app.api.artifacts.supersede(edge);
	expect(yield* Effect.flip(app.api.artifacts.supersede({ ...edge, supersededArtifactId: next, successorArtifactId: old }))).toMatchObject({
		_tag: "ArtifactLineageConflict",
		conflict: "cycle",
	});
	expect(yield* Effect.flip(app.api.artifacts.removeSupersession({ ...edge, actorAgentId: "agent:other" }))).toMatchObject({
		_tag: "ArtifactSupersessionUnauthorized",
	});
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).history).toMatchObject([{ id: old, supersededByArtifactId: next }]);
});
