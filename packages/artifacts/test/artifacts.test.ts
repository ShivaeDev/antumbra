import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Artifacts, ArtifactsLive } from "@antumbra/artifacts";
import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type DatabaseService } from "@antumbra/persistence";
import {
	persistenceIt,
	rejectTestOutcomeLinks,
	temporaryPersistence,
} from "@antumbra/persistence/testing";
import { NodeServices } from "@effect/platform-node";
import { expect } from "@effect/vitest";
import { Effect, Layer, PubSub } from "effect";

const it = persistenceIt();
const rejectedLinkPersistence = temporaryPersistence();

it.afterAll(rejectedLinkPersistence.remove);

const piece = {
	charter: "draw the reef",
	expectation: "a chart lands",
	id: "piece-chart",
	launchedAt: null,
	parkedAt: null,
	role: "cartographer",
	title: "Chart",
};

const agent = {
	charter: "draw the reef",
	id: "agent-chart",
	role: "cartographer",
	status: "alive",
};

const withArtifacts = <A, E, R>(
	use: (
		moorage: string,
		published: string,
	) => Effect.Effect<A, E, R | Artifacts>,
) =>
	Effect.gen(function* () {
		const root = mkdtempSync(join(tmpdir(), "antumbra-artifacts-"));
		const moorage = join(root, "moorage");
		const published = join(root, "published");
		mkdirSync(moorage);
		mkdirSync(published);
		const layer = ArtifactsLive(published).pipe(
			Layer.provideMerge(DomainFeedsLive),
			Layer.provide(NodeServices.layer),
		);
		return yield* use(moorage, published).pipe(
			Effect.provide(layer),
			Effect.ensuring(
				Effect.sync(() => rmSync(root, { force: true, recursive: true })),
			),
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

it.effectDB(
	"converges identical bytes without making commands exactly once",
	function* (db) {
		yield* withArtifacts((moorage) =>
			Effect.gen(function* () {
				yield* seed(db, moorage);
				writeFileSync(join(moorage, "reef.svg"), "<svg>reef</svg>");
				const artifacts = yield* Artifacts;
				const input = {
					authorAgentId: agent.id,
					pieceId: piece.id,
					title: "reef chart",
					uri: "reef.svg",
				};
				const first = yield* artifacts.land(input);
				const replay = yield* artifacts.land(input);
				writeFileSync(join(moorage, "reef.svg"), "<svg>new reef</svg>");
				const changed = yield* artifacts.land(input);

				expect(replay.artifact.id).not.toBe(first.artifact.id);
				expect(replay.artifact.uri).toBe(first.artifact.uri);
				expect(changed.artifact.id).not.toBe(first.artifact.id);
				expect(changed.artifact.uri).not.toBe(first.artifact.uri);
				expect(yield* db.Artifact.all()).toHaveLength(3);
				expect(yield* db.PieceArtifact.all()).toHaveLength(3);
				expect(existsSync(fileURLToPath(first.artifact.uri))).toBe(true);
			}),
		);
	},
);

it.effectDB(
	"refuses a symlink that escapes the acting Agent's moorage",
	function* (db) {
		yield* withArtifacts((moorage, published) =>
			Effect.gen(function* () {
				yield* seed(db, moorage);
				const outside = join(published, "outside.svg");
				writeFileSync(outside, "<svg>outside</svg>");
				symlinkSync(outside, join(moorage, "escape.svg"));
				const artifacts = yield* Artifacts;
				const failure = yield* Effect.flip(
					artifacts.land({
						authorAgentId: agent.id,
						pieceId: piece.id,
						title: "escape",
						uri: "escape.svg",
					}),
				);

				expect(failure._tag).toBe("ArtifactSourceNotOwned");
				expect(yield* db.Artifact.all()).toEqual([]);
			}),
		);
	},
);

it.effectDB(
	"reports an invalid stored Moorage status instead of calling it unowned",
	function* (db) {
		yield* withArtifacts((moorage) =>
			Effect.gen(function* () {
				yield* seed(db, moorage);
				yield* db.Moorage.where({ agentId: agent.id }).update({
					status: "future-moorage",
				});
				writeFileSync(join(moorage, "reef.svg"), "<svg>reef</svg>");
				const artifacts = yield* Artifacts;
				const failure = yield* Effect.flip(
					artifacts.land({
						authorAgentId: agent.id,
						pieceId: piece.id,
						title: "reef chart",
						uri: "reef.svg",
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
	},
);

it.effectDB("keeps an external URL as a reference", function* (db) {
	yield* withArtifacts(() =>
		Effect.gen(function* () {
			yield* db.Piece.create(piece);
			const artifacts = yield* Artifacts;
			const artifact = yield* artifacts.land({
				pieceId: piece.id,
				title: "hosted chart",
				uri: "https://example.test/reef.svg",
			});

			expect(artifact.artifact.uri).toBe("https://example.test/reef.svg");
			expect(yield* db.Artifact.all()).toHaveLength(1);
		}),
	);
});

it.effectDB("refuses an orphan artifact without publishing", function* (db) {
	yield* withArtifacts(() =>
		Effect.scoped(
			Effect.gen(function* () {
				const artifacts = yield* Artifacts;
				const feeds = yield* DomainFeeds;
				const notices = yield* PubSub.subscribe(feeds.voyages);
				const failure = yield* Effect.flip(
					artifacts.land({
						pieceId: "missing-piece",
						title: "orphan chart",
						uri: "https://example.test/orphan.svg",
					}),
				);

				expect(failure).toMatchObject({
					_tag: "PieceNotFound",
					pieceId: "missing-piece",
				});
				expect(yield* db.Artifact.all()).toEqual([]);
				expect(yield* db.PieceArtifact.all()).toEqual([]);
				expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
			}),
		),
	);
});

it.effect(
	"keeps published bytes but rolls back an Artifact whose Piece link is rejected",
	() =>
		withArtifacts((moorage, published) =>
			Effect.scoped(
				Effect.gen(function* () {
					const db = yield* Database;
					const artifacts = yield* Artifacts;
					const feeds = yield* DomainFeeds;
					const notices = yield* PubSub.subscribe(feeds.voyages);
					yield* seed(db, moorage);
					writeFileSync(join(moorage, "reef.svg"), "<svg>reef</svg>");
					yield* Effect.sync(() =>
						rejectTestOutcomeLinks(
							rejectedLinkPersistence.database,
							"artifact",
						),
					);

					const failure = yield* Effect.flip(
						artifacts.land({
							authorAgentId: agent.id,
							pieceId: piece.id,
							title: "rejected reef chart",
							uri: "reef.svg",
						}),
					);

					expect(failure._tag).toBe("PrismaError");
					expect(yield* db.Artifact.all()).toEqual([]);
					expect(yield* db.PieceArtifact.all()).toEqual([]);
					expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
					expect(readdirSync(published)).toHaveLength(1);
				}),
			),
		).pipe(Effect.provide(rejectedLinkPersistence.layer)),
);
