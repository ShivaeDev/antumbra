import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Artifacts, ArtifactsLive } from "@antumbra/artifacts";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import type { DatabaseService } from "@antumbra/persistence";
import { persistenceIt } from "@antumbra/persistence/testing";
import { NodeServices } from "@effect/platform-node";
import { expect } from "@effect/vitest";
import { Effect, Layer } from "effect";

const it = persistenceIt();
const markdownLimit = 1_048_576;
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

const withArtifacts = <A, E, R>(use: (moorage: string, published: string) => Effect.Effect<A, E, R | Artifacts>) =>
	Effect.gen(function* () {
		const root = mkdtempSync(join(tmpdir(), "antumbra-artifact-custody-"));
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

it.effectDB("reads only verified immutable CAS bytes", function* (db) {
	yield* withArtifacts((moorage, published) =>
		Effect.gen(function* () {
			yield* seed(db, moorage);
			writeFileSync(join(moorage, "reef.md"), "# Reef\n");
			const artifacts = yield* Artifacts;
			const landed = yield* artifacts.land({
				authorAgentId: agent.id,
				path: "reef.md",
				pieceId: piece.id,
				title: "reef chart",
			});
			expect(yield* artifacts.readMarkdown(landed.artifact.id)).toMatchObject({
				artifactId: landed.artifact.id,
				markdown: "# Reef\n",
			});
			const stored = join(published, landed.artifact.digest, landed.artifact.basename);
			writeFileSync(stored, "# Rock\n");
			expect(yield* Effect.flip(artifacts.readMarkdown(landed.artifact.id))).toMatchObject({
				_tag: "StoredArtifactContentInvalid",
				reason: "digest",
			});
		}),
	);
});

it.effectDB("fails closed on substituted or inconsistent stored custody", function* (db) {
	yield* withArtifacts((moorage, published) =>
		Effect.gen(function* () {
			yield* seed(db, moorage);
			writeFileSync(join(moorage, "reef.md"), "# Reef\n");
			const artifacts = yield* Artifacts;
			const landed = yield* artifacts.land({
				authorAgentId: agent.id,
				path: "reef.md",
				pieceId: piece.id,
				title: "reef chart",
			});
			const stored = join(published, landed.artifact.digest, landed.artifact.basename);
			yield* db.Artifact.where({ id: landed.artifact.id }).update({
				byteSize: landed.artifact.byteSize + 1,
			});
			expect(yield* Effect.flip(artifacts.readMarkdown(landed.artifact.id))).toMatchObject({
				_tag: "StoredArtifactContentInvalid",
				reason: "size",
			});
			yield* db.Artifact.where({ id: landed.artifact.id }).update({
				byteSize: landed.artifact.byteSize,
			});
			const outside = join(moorage, "outside.md");
			writeFileSync(outside, "# Reef\n");
			rmSync(stored);
			symlinkSync(outside, stored);
			expect(yield* Effect.flip(artifacts.readMarkdown(landed.artifact.id))).toMatchObject({
				_tag: "StoredArtifactContentInvalid",
				reason: "path",
			});
		}),
	);
});

it.effectDB("rejects stored bytes that are not UTF-8 even when their digest matches", function* (db) {
	yield* withArtifacts((_moorage, published) =>
		Effect.gen(function* () {
			yield* db.Piece.create(piece);
			const bytes = Uint8Array.of(0xc3, 0x28);
			const digest = createHash("sha256").update(bytes).digest("hex");
			mkdirSync(join(published, digest));
			writeFileSync(join(published, digest, "invalid.md"), bytes);
			yield* db.Artifact.create({
				authorAgentId: null,
				basename: "invalid.md",
				byteSize: bytes.length,
				digest,
				id: "artifact-invalid-utf8",
				pieceId: piece.id,
				title: "invalid",
			});
			const artifacts = yield* Artifacts;
			expect(yield* Effect.flip(artifacts.readMarkdown("artifact-invalid-utf8"))).toMatchObject({
				_tag: "StoredArtifactContentInvalid",
				reason: "not_utf8",
			});
		}),
	);
});

it.effectDB("enforces the inclusive one MiB Markdown limit", function* (db) {
	yield* withArtifacts((moorage) =>
		Effect.gen(function* () {
			yield* seed(db, moorage);
			const artifacts = yield* Artifacts;
			writeFileSync(join(moorage, "exact.md"), "a".repeat(markdownLimit));
			const exact = yield* artifacts.land({
				authorAgentId: agent.id,
				path: "exact.md",
				pieceId: piece.id,
				title: "exact",
			});
			writeFileSync(join(moorage, "large.md"), "a".repeat(markdownLimit + 1));
			const failure = yield* Effect.flip(
				artifacts.land({
					authorAgentId: agent.id,
					path: "large.md",
					pieceId: piece.id,
					title: "large",
				}),
			);
			expect(exact.artifact.byteSize).toBe(markdownLimit);
			expect(failure).toMatchObject({
				_tag: "ArtifactContentInvalid",
				reason: "too_large",
			});
		}),
	);
});

it.effectDB("refuses non-UTF-8 bytes and external URLs", function* (db) {
	yield* withArtifacts((moorage) =>
		Effect.gen(function* () {
			yield* seed(db, moorage);
			const artifacts = yield* Artifacts;
			writeFileSync(join(moorage, "invalid.md"), Uint8Array.of(0xc3, 0x28));
			const invalidBytes = yield* Effect.flip(
				artifacts.land({
					authorAgentId: agent.id,
					path: "invalid.md",
					pieceId: piece.id,
					title: "invalid",
				}),
			);
			const external = yield* Effect.flip(
				artifacts.land({
					authorAgentId: agent.id,
					path: "https://example.test/reef.md",
					pieceId: piece.id,
					title: "hosted chart",
				}),
			);
			expect(invalidBytes).toMatchObject({
				_tag: "ArtifactContentInvalid",
				reason: "not_utf8",
			});
			expect(external).toMatchObject({
				_tag: "ArtifactContentInvalid",
				reason: "uri",
			});
			expect(yield* db.Artifact.all()).toEqual([]);
		}),
	);
});
