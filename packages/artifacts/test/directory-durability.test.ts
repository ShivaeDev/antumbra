import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Artifacts, ArtifactsLive } from "@antumbra/artifacts";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import type { DatabaseService } from "@antumbra/persistence";
import { persistenceIt } from "@antumbra/persistence/testing";
import { NodeCrypto, NodeFileSystem, NodePath } from "@effect/platform-node";
import { expect } from "@effect/vitest";
import {
	type Crypto,
	Effect,
	FileSystem,
	Layer,
	type Path,
	PlatformError,
} from "effect";

const it = persistenceIt();

interface Fixture {
	readonly moorage: string;
	readonly published: string;
	readonly root: string;
	readonly source: string;
}

const makeFixture = (): Fixture => {
	const root = mkdtempSync(join(tmpdir(), "antumbra-directory-durability-"));
	const moorage = join(root, "moorage");
	mkdirSync(moorage);
	return {
		moorage,
		published: join(root, "published"),
		root,
		source: join(moorage, "reef.svg"),
	};
};

const seed = (db: DatabaseService, fixture: Fixture, suffix: string) =>
	Effect.gen(function* () {
		const agentId = `agent-${suffix}`;
		const pieceId = `piece-${suffix}`;
		yield* db.Piece.create({
			charter: "draw the reef",
			expectation: "a chart lands",
			id: pieceId,
			launchedAt: null,
			parkedAt: null,
			role: "cartographer",
			title: "Chart",
		});
		yield* db.Agent.create({
			charter: "draw the reef",
			id: agentId,
			role: "cartographer",
			status: "alive",
		});
		yield* db.Moorage.create({
			agentId,
			reclaimState: null,
			root: fixture.moorage,
			runner: "local",
			status: "ready",
		});
		return { agentId, pieceId };
	});

const wrappedFile = (
	file: FileSystem.File,
	sync: Effect.Effect<void, PlatformError.PlatformError>,
): FileSystem.File => ({
	[FileSystem.FileTypeId]: FileSystem.FileTypeId,
	read: (buffer) => file.read(buffer),
	readAlloc: (size) => file.readAlloc(size),
	seek: (offset, from) => file.seek(offset, from),
	stat: file.stat,
	sync,
	truncate: (length) => file.truncate(length),
	write: (buffer) => file.write(buffer),
	writeAll: (buffer) => file.writeAll(buffer),
});

interface FailureState {
	failed: boolean;
	readonly events: string[];
}

const failFirstSync = (file: FileSystem.File, state: FailureState) => {
	const observed = Effect.sync(() => state.events.push("sync"));
	if (state.failed) {
		return wrappedFile(file, observed.pipe(Effect.andThen(file.sync)));
	}
	const failure = PlatformError.systemError({
		_tag: "Unknown",
		description: "coordinated parent sync failure",
		method: "sync",
		module: "FileSystem",
	});
	return wrappedFile(
		file,
		observed.pipe(
			Effect.andThen(Effect.sync(() => (state.failed = true))),
			Effect.andThen(Effect.fail(failure)),
		),
	);
};

const fileSystemWithFailure = (
	fs: FileSystem.FileSystem,
	target: string,
	state: FailureState,
): FileSystem.FileSystem =>
	FileSystem.FileSystem.of({
		...fs,
		open: (path, options) =>
			fs
				.open(path, options)
				.pipe(
					Effect.map((file) =>
						path === target ? failFirstSync(file, state) : file,
					),
				),
	});

const failurePlatform = (target: string, state: FailureState) => {
	const fileSystem = Layer.effect(FileSystem.FileSystem)(
		FileSystem.FileSystem.use((fs) =>
			Effect.succeed(fileSystemWithFailure(fs, target, state)),
		),
	).pipe(Layer.provide(NodeFileSystem.layer));
	return Layer.mergeAll(NodeCrypto.layer, NodePath.layer, fileSystem);
};

const artifactLayer = (
	published: string,
	platform: Layer.Layer<FileSystem.FileSystem | Path.Path | Crypto.Crypto>,
) =>
	ArtifactsLive(published).pipe(
		Layer.provideMerge(DomainFeedsLive),
		Layer.provide(platform),
	);

const cases = [
	{
		name: "artifacts-root",
		target: (fixture: Fixture) => fixture.root,
	},
	{
		name: "digest-directory",
		target: (fixture: Fixture) => fixture.published,
	},
] as const;

it.effectDB(
	"lands only after new directory entries are durably linked",
	function* (db) {
		for (const boundary of cases) {
			const fixture = makeFixture();
			expect(existsSync(fixture.published)).toBe(false);
			writeFileSync(fixture.source, "inside");
			const identity = yield* seed(db, fixture, boundary.name);
			const state: FailureState = { events: [], failed: false };
			const layer = artifactLayer(
				fixture.published,
				failurePlatform(boundary.target(fixture), state),
			);
			const input = {
				authorAgentId: identity.agentId,
				pieceId: identity.pieceId,
				title: "reef chart",
				uri: "reef.svg",
			};
			const artifactsBefore = (yield* db.Artifact.all()).length;
			const failure = yield* Effect.gen(function* () {
				const artifacts = yield* Artifacts;
				return yield* Effect.flip(artifacts.land(input));
			}).pipe(Effect.provide(layer));

			expect(failure._tag).toBe("ArtifactPublicationFailed");
			expect(state.events).toEqual(["sync"]);
			expect(yield* db.Artifact.all()).toHaveLength(artifactsBefore);

			const artifact = yield* Effect.gen(function* () {
				const artifacts = yield* Artifacts;
				return yield* artifacts.land(input);
			}).pipe(Effect.provide(layer));
			expect(existsSync(fileURLToPath(artifact.artifact.uri))).toBe(true);
			expect(yield* db.Artifact.all()).toHaveLength(artifactsBefore + 1);
			rmSync(fixture.root, { force: true, recursive: true });
		}
	},
);
