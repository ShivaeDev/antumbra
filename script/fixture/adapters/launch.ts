import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { Effect, Schema } from "effect";
import { fixtureIO, Manifest } from "#fixture/manifest.ts";

const execute = promisify(execFile);

export const openBrowser = (url: string) => fixtureIO(() => execute("open", [url])).pipe(Effect.asVoid);

export const workingManifest = (directory: string) =>
	fixtureIO(async () => Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(await readFile(join(directory, "manifest.json"), "utf8")));
