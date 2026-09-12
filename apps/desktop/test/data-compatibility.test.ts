import { join } from "node:path";
import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, FileSystem } from "effect";
import { requireSupportedData } from "#adapters/data-compatibility.ts";

it.effect("refuses a legacy database before startup and leaves all installation files untouched", () =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const directory = yield* fs.makeTempDirectoryScoped();
		const legacy = join(directory, "antumbra.db");
		const journal = join(directory, "server", "journal.sqlite");
		yield* fs.makeDirectory(join(directory, "server"));
		yield* fs.writeFileString(legacy, "legacy database bytes");
		yield* fs.writeFileString(journal, "existing journal bytes");
		let started = false;
		const failure = yield* requireSupportedData(directory).pipe(
			Effect.andThen(
				Effect.sync(() => {
					started = true;
				}),
			),
			Effect.flip,
		);
		expect(failure).toMatchObject({ _tag: "UnsupportedLegacyData", path: legacy });
		expect(failure.message).toContain("Choose a fresh data directory or migrate the existing data");
		expect(started).toBe(false);
		expect(yield* fs.readFileString(legacy)).toBe("legacy database bytes");
		expect(yield* fs.readFileString(journal)).toBe("existing journal bytes");
		expect((yield* fs.readDirectory(directory)).toSorted()).toEqual(["antumbra.db", "server"]);
	}).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("accepts fresh directories and existing journal-only installations", () =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const directory = yield* fs.makeTempDirectoryScoped();
		yield* requireSupportedData(directory);
		yield* fs.makeDirectory(join(directory, "server"));
		const journal = join(directory, "server", "journal.sqlite");
		yield* fs.writeFileString(journal, "existing journal bytes");
		yield* requireSupportedData(directory);
		expect(yield* fs.readFileString(journal)).toBe("existing journal bytes");
	}).pipe(Effect.provide(NodeServices.layer)),
);
