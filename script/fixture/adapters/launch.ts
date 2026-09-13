import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Schema } from "effect";
import { fixtureIO, Manifest } from "#fixture/manifest.ts";

export const workingManifest = (directory: string) =>
	fixtureIO(async () => Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(await readFile(join(directory, "manifest.json"), "utf8")));
