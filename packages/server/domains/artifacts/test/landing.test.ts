import { answered, it } from "@antumbra/app-testing/entry.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { readArtifact } from "#acts/read.ts";
import { ArtifactId } from "#ids.ts";
import { chartering, custody, landing, opening, pieceId } from "#test/kit.ts";

it.app("landed bytes survive losing their source", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	const files = custody();
	yield* landing("chart", "old.md").pipe(Effect.provide(files.layer));
	files.source.clear();
	expect(yield* readArtifact(ArtifactId.make("chart")).pipe(Effect.provide(files.layer))).toMatchObject({ markdown: "# Old soundings" });
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).current).toHaveLength(1);
});

it.app("only an explicit revision moves an artifact into history", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	const files = custody();
	yield* landing("old", "old.md").pipe(Effect.provide(files.layer));
	yield* landing("same", "old.md").pipe(Effect.provide(files.layer));
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).current).toHaveLength(2);
	yield* landing("revision", "new.md", ArtifactId.make("old")).pipe(Effect.provide(files.layer));
	const reading = yield* answered(app.api.artifacts.byPiece({ pieceId }));
	expect(reading.current.map(({ id }) => id)).toEqual(expect.arrayContaining(["same", "revision"]));
	expect(reading.history).toMatchObject([{ id: "old", supersededByArtifactId: "revision" }]);
});

it.app("an unavailable source leaves no landed artifact", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	const files = custody();
	expect(yield* Effect.flip(landing("missing", "missing.md").pipe(Effect.provide(files.layer)))).toMatchObject({ _tag: "ArtifactSourceNotOwned" });
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).current).toEqual([]);
});
