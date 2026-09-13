import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { Clock, Effect, Schema } from "effect";
import { snapshotDatabase, validateEvidence } from "#fixture/adapters/evidence.ts";
import { FixtureError, fixtureIO, Manifest } from "#fixture/manifest.ts";

export { FixtureError, Manifest } from "#fixture/manifest.ts";

const execute = promisify(execFile);
const decodeManifest = Schema.decodeUnknownSync(Schema.fromJsonString(Manifest));

export const listFixtures = (archiveRoot: string) =>
	fixtureIO(async () => {
		if (!existsSync(archiveRoot)) return [];
		const manifests: Manifest[] = [];
		for (const entry of await readdir(archiveRoot)) {
			if (/^\d+$/.test(entry)) manifests.push(decodeManifest(await readFile(join(archiveRoot, entry, "manifest.json"), "utf8")));
		}
		return manifests.sort((left, right) => left.id - right.id);
	});

const inventory = async (root: string, directory = root): Promise<Manifest["files"]> => {
	const files: Manifest["files"][number][] = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await inventory(root, path)));
		else if (entry.isFile()) {
			const bytes = await readFile(path);
			files.push({ path: relative(root, path), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
		}
	}
	return files;
};

export const captureFixture = Effect.fn("Fixture.capture")(function* (input: {
	readonly sourceDirectory: string;
	readonly archiveRoot: string;
	readonly label: string;
	readonly source: "dev" | "prod";
}) {
	if (input.label.trim() === "" || /^\d+$/.test(input.label))
		return yield* Effect.fail(new FixtureError({ message: "Use a nonempty label that is not a numeric fixture ID." }));
	const catalog = yield* listFixtures(input.archiveRoot);
	if (catalog.some((fixture) => fixture.label === input.label))
		return yield* Effect.fail(new FixtureError({ message: `Fixture label already exists: ${input.label}` }));
	const id = Math.max(0, ...catalog.map((fixture) => fixture.id)) + 1;
	const captureStartedAt = new Date(yield* Clock.currentTimeMillis).toISOString();
	return yield* Effect.scoped(
		Effect.gen(function* () {
			const scratch = yield* Effect.acquireRelease(
				fixtureIO(() => mkdtemp(join(tmpdir(), "antumbra-fixture-"))),
				(path) => fixtureIO(() => rm(path, { recursive: true, force: true })).pipe(Effect.orDie),
			);
			const data = join(scratch, "data");
			yield* fixtureIO(() => mkdir(join(data, "server"), { recursive: true }));
			yield* snapshotDatabase(join(input.sourceDirectory, "server", "journal.db"), join(data, "server", "journal.db"));
			const runnerPaths = yield* fixtureIO(async () =>
				(await readdir(input.sourceDirectory)).filter((name) => /^runner\.sqlite(?:\.\d+)?$/.test(name)).sort(),
			);
			const identity = yield* fixtureIO(async () =>
				Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Struct({ logId: Schema.String })))(
					await readFile(join(input.sourceDirectory, "shell.json"), "utf8"),
				),
			);
			const runnerLogs = runnerPaths.map((path) => ({ path, seed: identity.logId }));
			for (const file of runnerLogs) yield* snapshotDatabase(join(input.sourceDirectory, file.path), join(data, file.path));
			for (const name of ["session-inputs", "artifacts", "drafts.json", "windows.json"]) {
				if (existsSync(join(input.sourceDirectory, name)))
					yield* fixtureIO(() => cp(join(input.sourceDirectory, name), join(data, name), { recursive: true }));
			}
			yield* validateEvidence(data, runnerLogs);
			const files = yield* fixtureIO(() => inventory(data));
			const manifest: Manifest = {
				formatVersion: 1,
				id,
				label: input.label,
				source: input.source,
				captureStartedAt,
				captureCompletedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
				producer: null,
				runnerLogs,
				files,
			};
			yield* fixtureIO(async () => {
				await writeFile(join(data, "manifest.json"), JSON.stringify(manifest, null, 2));
				await mkdir(input.archiveRoot, { recursive: true });
				const staged = await mkdtemp(join(input.archiveRoot, ".capture-"));
				try {
					await execute("tar", ["-czf", join(staged, "data.tar.gz"), "-C", data, "."]);
					await writeFile(join(staged, "manifest.json"), JSON.stringify(manifest, null, 2));
					await rename(staged, join(input.archiveRoot, String(id)));
				} finally {
					await rm(staged, { recursive: true, force: true });
				}
			});
			return manifest;
		}),
	);
});

export const extractFixture = Effect.fn("Fixture.extract")(function* (input: {
	readonly archiveRoot: string;
	readonly selector: string;
	readonly destination: string;
}) {
	const catalog = yield* listFixtures(input.archiveRoot);
	const manifest = catalog.find((fixture) => String(fixture.id) === input.selector || fixture.label === input.selector);
	if (manifest === undefined)
		return yield* Effect.fail(new FixtureError({ message: `No fixture named ${input.selector}. Use fixture list to see available IDs and labels.` }));
	yield* fixtureIO(async () => {
		await rm(input.destination, { recursive: true, force: true });
		await mkdir(input.destination, { recursive: true });
		await execute("tar", ["-xzf", join(input.archiveRoot, String(manifest.id), "data.tar.gz"), "-C", input.destination]);
		const archived = decodeManifest(await readFile(join(input.destination, "manifest.json"), "utf8"));
		if (JSON.stringify(archived) !== JSON.stringify(manifest)) throw new Error(`Fixture ${manifest.id} catalog does not match its archive manifest`);
		const actual = await inventory(input.destination);
		for (const file of manifest.files) {
			if (!actual.some((entry) => entry.path === file.path && entry.bytes === file.bytes && entry.sha256 === file.sha256))
				throw new Error(`Fixture ${manifest.id} failed file validation: ${file.path}`);
		}
	});
	return manifest;
});
