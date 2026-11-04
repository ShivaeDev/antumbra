import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { chartering, hasChartedReef, opening, soundings } from "@antumbra/app-testing/postgres-fixtures.ts";
import { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { PieceId } from "@antumbra/platform-vocabulary/piece.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";

const bytes = new TextEncoder().encode("# Soundings\nThree fathoms");
const landing = {
	pieceId: soundings,
	authorAgentId: null,
	title: "Chart",
	basename: "chart.md",
	bytes,
	supersedesArtifactId: null,
	requestId: Request.make("chart"),
};

postgresApp.it(
	"lands readable bytes before metadata and keeps explicit lineage through rebuild",
	[hasChartedReef],
	function* ({ api, rebuild, clearPublished, published }) {
		yield* api["artifacts.land"](landing);
		const id = ArtifactId.make("chart");
		expect(yield* api["artifacts.readContent"]({ artifactId: id })).toMatchObject({
			markdown: new TextDecoder().decode(bytes),
			byteSize: bytes.length,
		});
		const original = yield* api["artifacts.byId"]({ id });
		yield* api["artifacts.land"]({ ...landing, requestId: Request.make("revision"), title: "Revision", supersedesArtifactId: id });
		expect(yield* api["artifacts.byPiece"]({ pieceId: soundings })).toMatchObject({
			current: [{ id: "revision" }],
			history: [{ id, supersededByArtifactId: "revision" }],
		});
		yield* rebuild();
		expect(yield* api["artifacts.readContent"]({ artifactId: id })).toMatchObject({ markdown: new TextDecoder().decode(bytes) });
		const before = yield* api["artifacts.byPiece"]({ pieceId: soundings });
		yield* clearPublished();
		expect(
			yield* Effect.flip(api["artifacts.land"]({ ...landing, requestId: Request.make("rejected"), pieceId: PieceId.make("missing") })),
		).toMatchObject({ _tag: "UnknownPiece" });
		expect(yield* api["artifacts.byId"]({ id: ArtifactId.make("rejected") })).toBeNull();
		expect(yield* api["artifacts.byPiece"]({ pieceId: soundings })).toEqual(before);
		expect(yield* published()).toEqual([]);
		expect(original).toMatchObject({ digest: expect.any(String), byteSize: bytes.length });
	},
);

postgresApp.it(
	"replays captured artifact metadata and bytes then accepts a new landing",
	[],
	function* ({ api, journal, replayJournal, clearPublished, published }) {
		const legacy = yield* journal();
		yield* legacy.api.voyages.open(opening);
		yield* legacy.api.pieces.charter(chartering);
		const { agentId: authorAgentId } = yield* legacy.artifact.prepare("cartographer");
		yield* legacy.artifact.source("chart.md", new TextDecoder().decode(bytes));
		yield* legacy.artifact.land({
			requestId: landing.requestId,
			pieceId: soundings,
			authorAgentId,
			path: "chart.md",
			title: landing.title,
			supersedesArtifactId: null,
		});
		yield* replayJournal(legacy);
		expect(yield* api["artifacts.byPiece"]({ pieceId: soundings })).toEqual(
			yield* answered(legacy.api.artifacts.byPiece({ pieceId: soundings }), "artifacts"),
		);
		expect(yield* api["artifacts.readContent"]({ artifactId: ArtifactId.make("chart") })).toMatchObject({
			markdown: new TextDecoder().decode(bytes),
		});
		const watched = yield* legacy.watchKeys(["artifact", `artifact:${soundings}`]);
		yield* clearPublished();
		const edge = {
			supersededArtifactId: ArtifactId.make("chart"),
			successorArtifactId: ArtifactId.make("chart"),
			actorAgentId: null,
			requestId: Request.make("cycle"),
		};
		expect(yield* Effect.flip(api["artifacts.supersede"](edge))).toMatchObject({ _tag: "ArtifactLineageConflict" });
		expect(yield* published()).toEqual([]);
		yield* api["artifacts.land"]({ ...landing, authorAgentId, requestId: Request.make("another") });
		yield* legacy.artifact.land({
			requestId: Request.make("another"),
			pieceId: soundings,
			authorAgentId,
			path: "chart.md",
			title: landing.title,
			supersedesArtifactId: null,
		});
		expect(new Set((yield* published()).filter((key) => typeof key === "string" && key.startsWith("artifact")))).toEqual(new Set(watched.seen()));
	},
);

postgresApp.it(
	"exposes artifact metadata and refreshes only after commit",
	[hasChartedReef],
	function* ({ api, artifactsHistory, transaction, rollback, published, clearPublished }) {
		const written = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const event = {
			_tag: "ArtifactLanded" as const,
			id: ArtifactId.make("pending"),
			pieceId: soundings,
			authorAgentId: null,
			title: "Pending",
			basename: "pending.md",
			digest: "metadata-only",
			byteSize: 1,
			supersedesArtifactId: null,
			at: 0,
		};
		yield* clearPublished();
		const pending = yield* transaction(
			Effect.gen(function* () {
				yield* artifactsHistory.append(Request.make("pending"), [event]);
				yield* Deferred.succeed(written, undefined);
				yield* Deferred.await(release);
			}),
		).pipe(Effect.forkScoped);
		yield* Deferred.await(written);
		expect(yield* api["artifacts.byId"]({ id: event.id })).toBeNull();
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* api["artifacts.byId"]({ id: event.id })).toMatchObject({ title: "Pending" });
		yield* clearPublished();
		yield* rollback(artifactsHistory.append(Request.make("rollback"), [{ ...event, id: ArtifactId.make("rollback") }]));
		expect(yield* api["artifacts.byId"]({ id: ArtifactId.make("rollback") })).toBeNull();
		expect(yield* published()).toEqual([]);
	},
);
