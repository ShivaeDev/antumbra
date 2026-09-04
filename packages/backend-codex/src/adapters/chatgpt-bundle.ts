import { execFileSync } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { platform } from "node:os";
import { join } from "node:path";
import { Effect, Option, Schema } from "effect";

const decodeBundle = Schema.decodeUnknownOption(Schema.NonEmptyString);
const lookupBundle = 'ObjC.import("AppKit"); ObjC.unwrap($.NSWorkspace.sharedWorkspace.fullPathForApplication("ChatGPT")) || ""';

export const bundledCodex: Effect.Effect<Option.Option<string>> = Effect.sync(() => {
	if (platform() !== "darwin") {
		return Option.none();
	}
	try {
		const bundle = decodeBundle(execFileSync("osascript", ["-l", "JavaScript", "-e", lookupBundle], { encoding: "utf8" }).trim());
		if (Option.isNone(bundle)) {
			return Option.none();
		}
		const command = join(bundle.value, "Contents", "Resources", "codex");
		accessSync(command, constants.X_OK);
		return Option.some(command);
	} catch {
		return Option.none();
	}
});
