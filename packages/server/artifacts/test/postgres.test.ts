import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { hasChartedReef, soundings } from "@antumbra/app-testing/postgres-fixtures.ts";
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
		expect(yield* answered(api["artifacts.readContent"]({ artifactId: id }), "artifacts.readContent")).toMatchObject({
			markdown: new TextDecoder().decode(bytes),
			byteSize: bytes.length,
		});
		const original = yield* answered(api["artifacts.byId"]({ id }), "artifacts.byId");
		yield* api["artifacts.land"]({ ...landing, requestId: Request.make("revision"), title: "Revision", supersedesArtifactId: id });
		expect(yield* answered(api["artifacts.byPiece"]({ pieceId: soundings }), "artifacts.byPiece")).toMatchObject({
			current: [{ id: "revision" }],
			history: [{ id, supersededByArtifactId: "revision" }],
		});
		yield* rebuild();
		expect(yield* answered(api["artifacts.readContent"]({ artifactId: id }), "artifacts.readContent")).toMatchObject({
			markdown: new TextDecoder().decode(bytes),
		});
		const before = yield* answered(api["artifacts.byPiece"]({ pieceId: soundings }), "artifacts.byPiece");
		yield* clearPublished();
		expect(
			yield* Effect.flip(api["artifacts.land"]({ ...landing, requestId: Request.make("rejected"), pieceId: PieceId.make("missing") })),
		).toMatchObject({ _tag: "UnknownPiece" });
		expect(yield* answered(api["artifacts.byId"]({ id: ArtifactId.make("rejected") }), "artifacts.byId")).toBeNull();
		expect(yield* answered(api["artifacts.byPiece"]({ pieceId: soundings }), "artifacts.byPiece")).toEqual(before);
		expect(yield* published()).toEqual([]);
		expect(original).toMatchObject({ digest: expect.any(String), byteSize: bytes.length });
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
		expect(yield* answered(api["artifacts.byId"]({ id: event.id }), "artifacts.byId")).toBeNull();
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* answered(api["artifacts.byId"]({ id: event.id }), "artifacts.byId")).toMatchObject({ title: "Pending" });
		yield* clearPublished();
		yield* rollback(artifactsHistory.append(Request.make("rollback"), [{ ...event, id: ArtifactId.make("rollback") }]));
		expect(yield* answered(api["artifacts.byId"]({ id: ArtifactId.make("rollback") }), "artifacts.byId")).toBeNull();
		expect(yield* published()).toEqual([]);
	},
);
