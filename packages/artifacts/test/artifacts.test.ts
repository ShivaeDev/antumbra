import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Artifacts, ArtifactsLive } from "@antumbra/artifacts";
import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import type { DatabaseService } from "@antumbra/persistence";
import { persistenceIt } from "@antumbra/persistence/testing";
import { NodeServices } from "@effect/platform-node";
import { expect } from "@effect/vitest";
import { Effect, Layer, PubSub } from "effect";

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

const agent = {
	charter: "draw the reef",
	id: "agent-chart",
	role: "cartographer",
	status: "alive",
};

const withArtifacts = <A, E, R>(use: (moorage: string, published: string) => Effect.Effect<A, E, R | Artifacts>) =>
	Effect.gen(function* () {
		const root = mkdtempSync(join(tmpdir(), "antumbra-artifacts-"));
		const moorage = join(root, "moorage");
		const published = join(root, "published");
		mkdirSync(moorage);
		mkdirSync(published);
		const layer = ArtifactsLive(published).pipe(Layer.provideMerge(DomainFeedsLive), Layer.provide(NodeServices.layer));
		return yield* use(moorage, published).pipe(
			Effect.provide(layer),
			Effect.ensuring(Effect.sync(() => rmSync(root, { force: true, recursive: true }))),
		);
	});

const seed = (db: DatabaseService, root: string) =>
	Effect.gen(function* () {
		yield* db.Piece.create(piece);
		yield* db.Agent.create(agent);
		yield* db.Moorage.create({
			agentId: agent.id,
			reclaimState: null,
			root,
			runner: "local",
			status: "ready",
		});
	});

it.effectDB("converges identical bytes without making commands exactly once", function* (db) {
	yield* withArtifacts((moorage, published) =>
		Effect.gen(function* () {
			yield* seed(db, moorage);
			writeFileSync(join(moorage, "reef.md"), "# Reef");
			const artifacts = yield* Artifacts;
			const input = {
				authorAgentId: agent.id,
				pieceId: piece.id,
				title: "reef chart",
				path: "reef.md",
			};
			const first = yield* artifacts.land(input);
			const replay = yield* artifacts.land(input);
			writeFileSync(join(moorage, "reef.md"), "# New reef");
			const changed = yield* artifacts.land(input);

			expect(replay.artifact.id).not.toBe(first.artifact.id);
			expect(replay.artifact.digest).toBe(first.artifact.digest);
			expect(changed.artifact.id).not.toBe(first.artifact.id);
			expect(changed.artifact.digest).not.toBe(first.artifact.digest);
			expect(yield* db.Artifact.all()).toHaveLength(3);
			expect(existsSync(join(published, first.artifact.digest, first.artifact.basename))).toBe(true);
		}),
	);
});

it.effectDB("refuses a symlink that escapes the acting Agent's moorage", function* (db) {
	yield* withArtifacts((moorage, published) =>
		Effect.gen(function* () {
			yield* seed(db, moorage);
			const outside = join(published, "outside.md");
			writeFileSync(outside, "# Outside");
			symlinkSync(outside, join(moorage, "escape.md"));
			const artifacts = yield* Artifacts;
			const failure = yield* Effect.flip(
				artifacts.land({
					authorAgentId: agent.id,
					pieceId: piece.id,
					title: "escape",
					path: "escape.md",
				}),
			);

			expect(failure._tag).toBe("ArtifactSourceNotOwned");
			expect(yield* db.Artifact.all()).toEqual([]);
		}),
	);
});

it.effectDB("reports an invalid stored Moorage status instead of calling it unowned", function* (db) {
	yield* withArtifacts((moorage) =>
		Effect.gen(function* () {
			yield* seed(db, moorage);
			yield* db.Moorage.where({ agentId: agent.id }).update({
				status: "future-moorage",
			});
			writeFileSync(join(moorage, "reef.md"), "# Reef");
			const artifacts = yield* Artifacts;
			const failure = yield* Effect.flip(
				artifacts.land({
					authorAgentId: agent.id,
					pieceId: piece.id,
					title: "reef chart",
					path: "reef.md",
				}),
			);

			expect(failure).toMatchObject({
				_tag: "StoredMoorageStatusInvalid",
				agentId: agent.id,
				value: "future-moorage",
			});
			expect(yield* db.Artifact.all()).toEqual([]);
		}),
	);
});

it.effectDB("refuses known invalid supersession before publishing local bytes", function* (db) {
	yield* withArtifacts((moorage, published) =>
		Effect.gen(function* () {
			yield* seed(db, moorage);
			yield* db.Piece.create(otherPiece);
			const artifacts = yield* Artifacts;
			writeFileSync(join(moorage, "foreign.md"), "# Foreign");
			const old = yield* artifacts.land({
				authorAgentId: agent.id,
				path: "foreign.md",
				pieceId: otherPiece.id,
				title: "foreign chart",
			});
			const beforeArtifacts = yield* db.Artifact.all();
			const beforePublished = readdirSync(published);
			writeFileSync(join(moorage, "reef.md"), "# Reef");
			const failure = yield* Effect.flip(
				artifacts.land({
					authorAgentId: agent.id,
					pieceId: piece.id,
					supersedesArtifactId: old.artifact.id,
					title: "wrong lineage",
					path: "reef.md",
				}),
			);

			expect(failure._tag).toBe("ArtifactProvenanceConflict");
			expect(readdirSync(published)).toEqual(beforePublished);
			expect(yield* db.Artifact.all()).toEqual(beforeArtifacts);
		}),
	);
});

it.effectDB("refuses an orphan artifact without publishing", function* (db) {
	yield* withArtifacts(() =>
		Effect.scoped(
			Effect.gen(function* () {
				const artifacts = yield* Artifacts;
				const feeds = yield* DomainFeeds;
				const notices = yield* feeds.subscribeVoyageRefresh();
				const failure = yield* Effect.flip(
					artifacts.land({
						authorAgentId: agent.id,
						path: "orphan.md",
						pieceId: "missing-piece",
						title: "orphan chart",
					}),
				);

				expect(failure).toMatchObject({
					_tag: "PieceNotFound",
					pieceId: "missing-piece",
				});
				expect(yield* db.Artifact.all()).toEqual([]);
				expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
			}),
		),
	);
});
