import { fileURLToPath } from "node:url";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, FileSystem, Path, Schema } from "effect";

const archive = Schema.Struct({ version: Schema.Literal(1), statements: Schema.Array(Schema.String) });
export const capturedLegacyFile = Effect.fn("LegacyFixture.captureFile")(function* () {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const fixture = yield* fs
		.readFileString(fileURLToPath(import.meta.resolve("@antumbra/legacy-fixture/v1/samples/app.json")))
		.pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(archive))));
	const filename = path.join(yield* fs.makeTempDirectoryScoped(), "legacy-v1.db");
	const sql = yield* SqliteClient.make({ filename });
	for (const statement of fixture.statements) yield* sql.unsafe(statement);
	return filename;
});
