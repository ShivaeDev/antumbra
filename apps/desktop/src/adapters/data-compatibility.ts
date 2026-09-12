import { join } from "node:path";
import { Data, Effect, FileSystem } from "effect";

export class UnsupportedLegacyData extends Data.TaggedError("UnsupportedLegacyData")<{ readonly path: string }> {
	override get message(): string {
		return `This version of Antumbra cannot upgrade the legacy database at ${this.path}. Your existing files have not been changed. Choose a fresh data directory or migrate the existing data before starting this version.`;
	}
}

export const requireSupportedData = Effect.fn("Shell.requireSupportedData")(function* (directory: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = join(directory, "antumbra.db");
	if (yield* fs.exists(path)) return yield* new UnsupportedLegacyData({ path });
});
