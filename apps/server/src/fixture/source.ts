import { LegacySource } from "@antumbra/legacy-fixture/source.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Layer } from "effect";

export const legacySource = Layer.succeed(LegacySource, {
	open: (filename) => SqliteClient.make({ filename, readonly: true }),
});
