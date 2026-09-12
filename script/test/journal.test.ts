import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { DataDirectory } from "@antumbra/server-journal/database.ts";
import * as Journal from "@antumbra/server-journal/journal.ts";
import { commitsOf } from "@antumbra/server-journal/testing/commits.ts";
import { NodeFileSystem } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Layer, Result } from "effect";
import { afterEach, describe, expect } from "vitest";
import { parseCommand, usage } from "#journal/command.ts";
import { devDataDirectory } from "#journal/paths.ts";
import { run } from "#journal/program.ts";
import { definition } from "#test/support/journal-fixture.ts";

const roots: string[] = [];

const makeRoot = (): string => {
	const root = mkdtempSync(join(tmpdir(), "antumbra-journal-"));
	mkdirSync(join(root, "server"));
	roots.push(root);
	return root;
};

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

const seed = (root: string) =>
	Effect.gen(function* () {
		const commits = commitsOf(definition, yield* Commit);
		yield* commits.ledger.write({ id: "one", text: "first" });
		yield* commits.ledger.write({ id: "two", text: "second" });
		yield* commits.ledger.clear({ id: "one" });
		yield* commits.beacons.light({ id: "bright" });
	}).pipe(
		Effect.provide(
			Journal.layer(definition).pipe(
				Layer.provideMerge(Journal.file()),
				Layer.provide(Layer.succeed(DataDirectory, { path: join(root, "server") })),
				Layer.provide(NodeFileSystem.layer),
			),
		),
		Effect.orDie,
	);

describe("journal reset", () => {
	it.effect("removes the journal with its side files and leaves everything else", () =>
		Effect.gen(function* () {
			const root = makeRoot();
			yield* seed(root);
			const journal = join(root, "server", "journal.db");
			writeFileSync(`${journal}-wal`, "");
			writeFileSync(`${journal}-shm`, "");
			mkdirSync(join(root, "server", "backups"));
			writeFileSync(join(root, "server", "backups", "journal-1.db"), "");
			writeFileSync(join(root, "traces.db"), "");
			expect(yield* run({ kind: "reset" }, root, definition.features)).toEqual({ lines: [`removed ${journal}`], refused: false });
			expect(readdirSync(join(root, "server"))).toEqual(["backups"]);
			expect(readdirSync(root).toSorted()).toEqual(["server", "traces.db"]);
		}),
	);

	it.effect("refuses while the desktop lock is in the data directory", () =>
		Effect.gen(function* () {
			const root = makeRoot();
			yield* seed(root);
			const lock = join(root, "SingletonLock");
			symlinkSync("some-host-4321", lock);
			const outcome = yield* run({ kind: "reset" }, root, definition.features);
			expect(outcome.refused).toBe(true);
			expect(outcome.lines).toEqual([`Antumbra appears to be running; quit the app, or remove ${lock} if it is stale, then try again`]);
			expect(readdirSync(join(root, "server"))).toEqual(["journal.db"]);
		}),
	);

	it.effect("says so when there is no journal to remove", () =>
		Effect.gen(function* () {
			const root = makeRoot();
			const outcome = yield* run({ kind: "reset" }, root, definition.features);
			expect(outcome.lines).toEqual([`no dev journal at ${join(root, "server", "journal.db")}`]);
		}),
	);
});

describe("journal facts", () => {
	it.effect("counts each fact under the feature that declares it", () =>
		Effect.gen(function* () {
			const root = makeRoot();
			yield* seed(root);
			const outcome = yield* run({ kind: "facts", tail: undefined }, root, definition.features);
			expect(outcome.lines).toEqual(["ledger", "  NoteWritten  2", "  NoteCleared  1", "beacons", "  BeaconLit    1", "", "4 facts, highest seq 4"]);
		}),
	);

	it.effect("tails the last facts oldest first after the summary", () =>
		Effect.gen(function* () {
			const root = makeRoot();
			yield* seed(root);
			const outcome = yield* run({ kind: "facts", tail: 2 }, root, definition.features);
			expect(outcome.lines.at(-3)).toBe("");
			expect(outcome.lines.at(-4)).toBe("4 facts, highest seq 4");
			expect(outcome.lines.at(-2)).toMatch(/^3 {2}\d{4}-\d{2}-\d{2}T[\d:.]+Z {2}NoteCleared {2}\S+$/);
			expect(outcome.lines.at(-1)).toMatch(/^4 {2}\d{4}-\d{2}-\d{2}T[\d:.]+Z {2}BeaconLit {4}\S+$/);
		}),
	);

	it.effect("says so when there is no journal to read", () =>
		Effect.gen(function* () {
			const root = makeRoot();
			const outcome = yield* run({ kind: "facts", tail: undefined }, root, definition.features);
			expect(outcome.lines).toEqual([`no dev journal at ${join(root, "server", "journal.db")}`]);
		}),
	);
});

describe("journal args", () => {
	it("takes reset, facts, and a positive tail count", () => {
		expect(parseCommand(["reset"])).toEqual(Result.succeed({ kind: "reset" }));
		expect(parseCommand(["facts"])).toEqual(Result.succeed({ kind: "facts", tail: undefined }));
		expect(parseCommand(["facts", "--tail", "20"])).toEqual(Result.succeed({ kind: "facts", tail: 20 }));
	});

	it("rejects an unknown verb, a stray argument, and a tail that is not a count", () => {
		expect(parseCommand([])).toEqual(Result.fail(usage));
		expect(parseCommand(["wipe"])).toEqual(Result.fail(usage));
		expect(parseCommand(["reset", "--tail", "2"])).toEqual(Result.fail(usage));
		expect(parseCommand(["facts", "--tail", "0"])).toEqual(Result.fail(`--tail takes a positive whole number, not "0"\n${usage}`));
	});
});

describe("dev data directory", () => {
	const appData = "/Users/someone/Library/Application Support";

	it("defaults beside the packaged directory and takes an absolute override", () => {
		expect(devDataDirectory(appData, "")).toEqual(Result.succeed(`${appData}/Antumbra-Dev`));
		expect(devDataDirectory(appData, "/tmp/antumbra")).toEqual(Result.succeed("/tmp/antumbra"));
		expect(devDataDirectory(appData, "antumbra")).toEqual(Result.fail("ANTUMBRA_DEV_USER_DATA must be an absolute path"));
	});
});

describe("journal entry point", () => {
	it("exits 1 with usage when called without a subcommand", () => {
		const entry = join(dirname(dirname(fileURLToPath(import.meta.url))), "journal.ts");
		const result = spawnSync("node", [entry], { encoding: "utf8" });
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("usage: pnpm journal reset");
		expect(result.stderr).toContain("pnpm journal facts [--tail <count>]");
	});
});
