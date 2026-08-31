import { accessSync, constants } from "node:fs";
import { Effect, Option } from "effect";

// ChatGPT for macOS bundles Codex at this path.
const BUNDLED = "/Applications/ChatGPT.app/Contents/Resources/codex";

export const bundledCodex: Effect.Effect<Option.Option<string>> = Effect.sync(() => {
	try {
		accessSync(BUNDLED, constants.X_OK);
		return Option.some(BUNDLED);
	} catch {
		return Option.none();
	}
});
