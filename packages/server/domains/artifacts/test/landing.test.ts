import { prepareArtifactSource } from "@antumbra/app-testing/artifact-source.ts";
import { readArtifact } from "@antumbra/app-testing/artifacts.ts";
import { answered, it } from "@antumbra/app-testing/entry.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { ArtifactId } from "#ids.ts";
import { chartering, landing, opening, pieceId } from "#test/kit.ts";

it.app("landed bytes survive losing their source", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* prepareArtifactSource({ agentId: "agent:cartographer" });
	app.artifacts.source.set("old.md", "# Old soundings");
	app.artifacts.source.set("new.md", "# New soundings");
	yield* landing("chart", "old.md");
	app.artifacts.source.clear();
	expect(yield* readArtifact(ArtifactId.make("chart"))).toMatchObject({ markdown: "# Old soundings" });
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).current).toHaveLength(1);
});

it.app("only an explicit revision moves an artifact into history", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* prepareArtifactSource({ agentId: "agent:cartographer" });
	app.artifacts.source.set("old.md", "# Old soundings");
	app.artifacts.source.set("new.md", "# New soundings");
	yield* landing("old", "old.md");
	yield* landing("same", "old.md");
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).current).toHaveLength(2);
	yield* landing("revision", "new.md", ArtifactId.make("old"));
	const reading = yield* answered(app.api.artifacts.byPiece({ pieceId }));
	expect(reading.current.map(({ id }) => id)).toEqual(expect.arrayContaining(["same", "revision"]));
	expect(reading.history).toMatchObject([{ id: "old", supersededByArtifactId: "revision" }]);
	expect(yield* app.rows.pieceOutcome.where({ pieceId })).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ sourceId: "old", sourceKind: "artifact", status: "landed" }),
			expect.objectContaining({ sourceId: "revision", sourceKind: "artifact", status: "landed" }),
		]),
	);
});

it.app("an unavailable source leaves no landed artifact", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* prepareArtifactSource({ agentId: "agent:cartographer" });
	app.artifacts.source.set("old.md", "# Old soundings");
	app.artifacts.source.set("new.md", "# New soundings");
	expect(yield* Effect.flip(landing("missing", "missing.md"))).toMatchObject({ _tag: "ArtifactPublicationFailed" });
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).current).toEqual([]);
});

it.app("an author without ready source ownership cannot land bytes", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	app.artifacts.source.set("old.md", "# Old soundings");
	expect(yield* Effect.flip(landing("unowned", "old.md"))).toMatchObject({ _tag: "ArtifactSourceNotOwned" });
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).current).toEqual([]);
});
