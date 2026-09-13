import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { afterEach, describe, expect } from "vitest";
import { captureFixture, extractFixture, listFixtures } from "#fixture/adapters/archive.ts";

const sample = (root: string) => {
	const sourceDirectory = join(root, "source");
	mkdirSync(join(sourceDirectory, "server"), { recursive: true });
	const server = new DatabaseSync(join(sourceDirectory, "server", "journal.db"));
	server.exec(
		"PRAGMA journal_mode = WAL; CREATE TABLE journal(seq INTEGER PRIMARY KEY, name TEXT, payload TEXT); CREATE TABLE runner_cursor(logId TEXT, cursor INTEGER)",
	);
	server.prepare("INSERT INTO runner_cursor VALUES (?, ?)").run("recording", 1);
	server.prepare("INSERT INTO journal VALUES (?, ?, ?)").run(1, "SessionProviderEvent", JSON.stringify({ logId: "recording", cursor: 1 }));
	const runner = new DatabaseSync(join(sourceDirectory, "runner.sqlite"));
	runner.exec(
		"PRAGMA journal_mode = WAL; CREATE TABLE runner_log(cursor INTEGER PRIMARY KEY, at REAL, event TEXT); CREATE TABLE log_shape(logId TEXT, hash TEXT)",
	);
	runner.prepare("INSERT INTO log_shape VALUES (?, ?)").run("recording", "historical-shape");
	runner.prepare("INSERT INTO runner_log VALUES (?, ?, ?)").run(1, 10, '{"type":"started"}');
	const retained = new DatabaseSync(join(sourceDirectory, "runner.sqlite.100"));
	retained.exec("CREATE TABLE runner_log(cursor INTEGER PRIMARY KEY, at REAL, event TEXT); CREATE TABLE log_shape(logId TEXT, hash TEXT)");
	retained.prepare("INSERT INTO log_shape VALUES (?, ?)").run("earlier", "older-shape");
	retained.prepare("INSERT INTO runner_log VALUES (?, ?, ?)").run(1, 5, '{"type":"earlier"}');
	retained.close();
	server.prepare("INSERT INTO journal VALUES (?, ?, ?)").run(2, "SessionProviderEvent", JSON.stringify({ logId: "earlier", cursor: 1 }));
	const digest = createHash("sha256").update("image bytes").digest("hex");
	mkdirSync(join(sourceDirectory, "session-inputs", digest), { recursive: true });
	writeFileSync(join(sourceDirectory, "session-inputs", digest, "image.png"), "image bytes");
	server
		.prepare("INSERT INTO journal VALUES (?, ?, ?)")
		.run(3, "InputRecorded", JSON.stringify({ parts: [{ type: "image", attachment: { digest, mediaType: "image/png" }, name: "image.png" }] }));
	writeFileSync(join(sourceDirectory, "shell.json"), JSON.stringify({ logId: "seed", token: "excluded-secret", port: 1000 }));
	writeFileSync(join(sourceDirectory, "drafts.json"), '{"draft":"hello"}');
	mkdirSync(join(sourceDirectory, "moorage"));
	writeFileSync(join(sourceDirectory, "moorage", "excluded"), "worktree");
	return { sourceDirectory, server, runner };
};

const cleanup: (() => void)[] = [];
afterEach(() => {
	for (const close of cleanup.splice(0)) close();
});

describe("visual fixture archives", () => {
	it.effect("captures active WAL data without changing the source and extracts fresh experiments", () =>
		Effect.gen(function* () {
			const root = mkdtempSync(join(tmpdir(), "fixture-test-"));
			const sampleData = sample(root);
			cleanup.push(() => {
				sampleData.server.close();
				sampleData.runner.close();
				rmSync(root, { recursive: true, force: true });
			});
			{
				const sourceFile = join(sampleData.sourceDirectory, "server", "journal.db");
				const before = createHash("sha256").update(readFileSync(sourceFile)).digest("hex");
				const archiveRoot = join(root, "archive");
				const first = yield* captureFixture({ sourceDirectory: sampleData.sourceDirectory, archiveRoot, label: "first", source: "dev" });
				const second = yield* captureFixture({ sourceDirectory: sampleData.sourceDirectory, archiveRoot, label: "second", source: "prod" });
				expect([first.id, second.id]).toEqual([1, 2]);
				expect(first.runnerLogs.map(({ path }) => path)).toEqual(["runner.sqlite", "runner.sqlite.100"]);
				expect((yield* listFixtures(archiveRoot)).map(({ label }) => label)).toEqual(["first", "second"]);
				expect(createHash("sha256").update(readFileSync(sourceFile)).digest("hex")).toBe(before);
				const destination = join(root, "open");
				yield* extractFixture({ archiveRoot, selector: "first", destination });
				const extracted = new DatabaseSync(join(destination, "server", "journal.db"), { readOnly: true });
				expect(extracted.prepare("SELECT name FROM journal").get()?.name).toBe("SessionProviderEvent");
				extracted.close();
				expect(existsSync(join(destination, "shell.json"))).toBe(false);
				expect(existsSync(join(destination, "moorage"))).toBe(false);
				expect(first.files.some(({ path }) => path.startsWith("session-inputs/"))).toBe(true);
				writeFileSync(join(destination, "drafts.json"), "experiment");
				yield* extractFixture({ archiveRoot, selector: "1", destination });
				expect(readFileSync(join(destination, "drafts.json"), "utf8")).toBe('{"draft":"hello"}');
			}
		}),
	);

	it.effect("refuses a journal whose referenced runner evidence is absent", () =>
		Effect.gen(function* () {
			const root = mkdtempSync(join(tmpdir(), "fixture-test-"));
			const sampleData = sample(root);
			cleanup.push(() => {
				sampleData.server.close();
				sampleData.runner.close();
				rmSync(root, { recursive: true, force: true });
			});
			{
				sampleData.server.prepare("UPDATE runner_cursor SET cursor = ?").run(2);
				const archiveRoot = join(root, "archive");
				const result = yield* Effect.result(
					captureFixture({ sourceDirectory: sampleData.sourceDirectory, archiveRoot, label: "missing", source: "dev" }),
				);
				expect(result).toMatchObject({
					_tag: "Failure",
					failure: { message: expect.stringContaining("Missing runner evidence recording at cursor 2") },
				});
				expect(yield* listFixtures(archiveRoot)).toEqual([]);
				sampleData.server.prepare("UPDATE runner_cursor SET cursor = ?").run(1);
				rmSync(join(sampleData.sourceDirectory, "session-inputs"), { recursive: true });
				const missingImage = yield* Effect.result(
					captureFixture({ sourceDirectory: sampleData.sourceDirectory, archiveRoot, label: "missing-image", source: "dev" }),
				);
				expect(missingImage).toMatchObject({
					_tag: "Failure",
					failure: { message: expect.stringContaining("Missing captured content session-inputs/") },
				});
				expect(yield* listFixtures(archiveRoot)).toEqual([]);
			}
		}),
	);
});
