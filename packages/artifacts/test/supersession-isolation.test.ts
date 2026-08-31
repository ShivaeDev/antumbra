import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Artifacts, ArtifactsLive } from "@antumbra/artifacts";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type DatabaseService } from "@antumbra/persistence";
import { persistenceIt } from "@antumbra/persistence/testing";
import { NodeServices } from "@effect/platform-node";
import { expect } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

const it = persistenceIt();
const piece = {
	charter: "draw the reef",
	expectation: "a chart lands",
	id: "piece-chart",
	launchedAt: null,
	parkedAt: null,
	role: "cartographer",
	title: "Chart",
};
const otherPiece = { ...piece, id: "piece-log", title: "Log" };
const root = mkdtempSync(join(tmpdir(), "antumbra-supersession-isolation-"));
const published = join(root, "published");
mkdirSync(published);
it.afterAll(() => rmSync(root, { force: true, recursive: true }));
const layer = ArtifactsLive(published).pipe(Layer.provideMerge(DomainFeedsLive), Layer.provide(NodeServices.layer));

const ensureAuthor = (db: DatabaseService) =>
	Effect.gen(function* () {
		const agentId = "agent-chart";
		const moorage = join(root, agentId);
		if (Option.isNone(yield* db.Agent.where({ id: agentId }).first())) {
			yield* db.Agent.create({
				charter: "draw the reef",
				id: agentId,
				role: "cartographer",
				status: "alive",
			});
			mkdirSync(moorage, { recursive: true });
			yield* db.Moorage.create({
				agentId,
				reclaimState: null,
				root: moorage,
				runner: "local",
				status: "ready",
			});
		}
		return moorage;
	});

const land = (pieceId: string, title: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const artifacts = yield* Artifacts;
		const moorage = yield* ensureAuthor(db);
		const path = `${title}.md`;
		writeFileSync(join(moorage, path), `# ${title}\n`);
		return yield* artifacts.land({
			authorAgentId: "agent-chart",
			path,
			pieceId,
			title,
		});
	});

it.effectDB("refuses invalid landing before any Artifact mutation", function* (db) {
	yield* db.Piece.create(piece);
	yield* db.Piece.create(otherPiece);
	const old = yield* land(otherPiece.id, "foreign").pipe(Effect.provide(layer));
	const before = yield* db.Artifact.all();
	const moorage = yield* ensureAuthor(db);
	writeFileSync(join(moorage, "wrong.md"), "# wrong\n");
	const failure = yield* Effect.flip(
		Artifacts.pipe(
			Effect.flatMap((artifacts) =>
				artifacts.land({
					authorAgentId: "agent-chart",
					path: "wrong.md",
					pieceId: piece.id,
					supersedesArtifactId: old.artifact.id,
					title: "wrong lineage",
				}),
			),
			Effect.provide(layer),
		),
	);
	expect(failure._tag).toBe("ArtifactProvenanceConflict");
	expect(yield* db.Artifact.all()).toEqual(before);
});
