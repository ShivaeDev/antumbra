import { validateFixture } from "@antumbra/legacy-fixture/validate.ts";
import type { AppDefinition } from "@antumbra/platform-feature/app.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, FileSystem, Path } from "effect";

export const validateFixtureFacts = Effect.fn("Fixture.validateCapturedFacts")(function* (
	_definition: AppDefinition,
	facts: readonly { readonly name: string; readonly payload: string }[],
) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const filename = path.join(yield* fs.makeTempDirectoryScoped(), "journal.db");
	const sql = yield* SqliteClient.make({ filename });
	yield* sql`create table journal (seq integer primary key, name text not null, payload text not null, at integer not null, requestId text not null)`;
	for (const [index, fact] of facts.entries())
		yield* sql`insert into journal ${sql.insert({ seq: index + 1, at: 0, requestId: `fixture:${index}`, ...fact })}`;
	yield* validateFixture(filename);
});
