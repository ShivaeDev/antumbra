import {
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
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
	const root = mkdtempSync(join(tmpdir(), "antumbra-publish-integrity-"));
	const moorage = join(root, "moorage");
	const published = join(root, "published");
	mkdirSync(moorage);
	mkdirSync(published);
	return { moorage, published, root, source: join(moorage, "reef.svg") };
};

const seed = (db: DatabaseService, moorage: string) =>
	Effect.gen(function* () {
		yield* db.Piece.create({
			charter: "draw the reef",
			expectation: "a chart lands",
			id: "piece-chart",
			launchedAt: null,
			parkedAt: null,
			role: "cartographer",
			title: "Chart",
		});
		yield* db.Agent.create({
			charter: "draw the reef",
			id: "agent-chart",
			role: "cartographer",
			status: "alive",
		});
		yield* db.Moorage.create({
			agentId: "agent-chart",
			reclaimState: null,
			root: moorage,
			runner: "local",
			status: "ready",
		});
	});

const input = {
	authorAgentId: "agent-chart",
	pieceId: "piece-chart",
	title: "reef chart",
	uri: "reef.svg",
};

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

const platformWith = (
	make: (fs: FileSystem.FileSystem) => FileSystem.FileSystem,
): Layer.Layer<FileSystem.FileSystem | Path.Path | Crypto.Crypto> => {
	const fileSystem = Layer.effect(FileSystem.FileSystem)(
		FileSystem.FileSystem.use((fs) => Effect.succeed(make(fs))),
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

const syncEvidenceFile = (
	file: FileSystem.File,
	path: string,
	fixture: Fixture,
	events: string[],
	syncFailure: PlatformError.PlatformError,
): FileSystem.File => {
	if (basename(path).startsWith(".publish-")) {
		const sync = Effect.sync(() => events.push("file-sync")).pipe(
			Effect.andThen(file.sync),
		);
		return wrappedFile(file, sync);
	}
	if (
		path !== fixture.published &&
		path.startsWith(fixture.published) &&
		lstatSync(path).isDirectory()
	) {
		const sync = Effect.sync(() => events.push("directory-sync")).pipe(
			Effect.andThen(Effect.fail(syncFailure)),
		);
		return wrappedFile(file, sync);
	}
	return file;
};

const durabilityPlatform = (
	fixture: Fixture,
	events: string[],
	syncFailure: PlatformError.PlatformError,
) =>
	platformWith((fs) =>
		FileSystem.FileSystem.of({
			...fs,
			open: (path, options) =>
				fs
					.open(path, options)
					.pipe(
						Effect.map((file) =>
							syncEvidenceFile(file, path, fixture, events, syncFailure),
						),
					),
			rename: (from, to) =>
				Effect.sync(() => events.push("rename")).pipe(
					Effect.andThen(fs.rename(from, to)),
				),
		}),
	);

interface ReplacementState {
	replaced: boolean;
}

const replacementPlatform = (outside: string, state: ReplacementState) =>
	platformWith((fs) =>
		FileSystem.FileSystem.of({
			...fs,
			stat: (path) => {
				if (!path.endsWith("/moorage/reef.svg") || state.replaced) {
					return fs.stat(path);
				}
				return fs.stat(path).pipe(
					Effect.tap(() =>
						Effect.sync(() => {
							rmSync(path);
							symlinkSync(outside, path);
							state.replaced = true;
						}),
					),
				);
			},
		}),
	);

it.effectDB(
	"refuses completion until file and directory sync finish",
	function* (db) {
		const fixture = makeFixture();
		writeFileSync(fixture.source, "inside");
		const events: string[] = [];
		const syncFailure = PlatformError.systemError({
			_tag: "Unknown",
			description: "coordinated directory sync failure",
			method: "sync",
			module: "FileSystem",
		});
		const platform = durabilityPlatform(fixture, events, syncFailure);
		yield* seed(db, fixture.moorage);
		const failure = yield* Effect.gen(function* () {
			const artifacts = yield* Artifacts;
			return yield* Effect.flip(artifacts.land(input));
		}).pipe(Effect.provide(artifactLayer(fixture.published, platform)));

		expect(failure._tag).toBe("ArtifactPublicationFailed");
		expect(events).toEqual(["file-sync", "rename", "directory-sync"]);
		expect(yield* db.Artifact.all()).toEqual([]);
		rmSync(fixture.root, { force: true, recursive: true });
	},
);

it.effectDB(
	"reads the same owned object when its path is replaced",
	function* (db) {
		const fixture = makeFixture();
		const outside = join(fixture.root, "outside.svg");
		writeFileSync(fixture.source, "inside");
		writeFileSync(outside, "outside");
		const state = { replaced: false };
		const platform = replacementPlatform(outside, state);
		yield* seed(db, fixture.moorage);
		const artifact = yield* Effect.gen(function* () {
			const artifacts = yield* Artifacts;
			return yield* artifacts.land(input);
		}).pipe(Effect.provide(artifactLayer(fixture.published, platform)));

		expect(state.replaced).toBe(true);
		expect(readFileSync(fileURLToPath(artifact.artifact.uri), "utf8")).toBe(
			"inside",
		);
		rmSync(fixture.root, { force: true, recursive: true });
	},
);
