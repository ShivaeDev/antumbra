import { accessSync, constants } from "node:fs";
import { Effect, Option } from "effect";

// why: the ChatGPT desktop app ships the codex binary inside itself, so a user
// who installed that app already has a working codex even with nothing of that
// name on their PATH.
const BUNDLED = "/Applications/ChatGPT.app/Contents/Resources/codex";

export const bundledCodex: Effect.Effect<Option.Option<string>> = Effect.sync(() => {
	try {
		accessSync(BUNDLED, constants.X_OK);
		return Option.some(BUNDLED);
	} catch {
		return Option.none();
	}
});
