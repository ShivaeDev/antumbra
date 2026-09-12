import type { AgentBackend } from "@antumbra/runner-ports/backend.ts";
import { Effect, Option } from "effect";
import { findOnLoginPath } from "#adapters/login-shell.ts";
import { claudeBackend } from "#backends/claude/backend.ts";
import { codexCommand, makeCodexBackend } from "#backends/codex/backend.ts";
import { makeOpencodeBackend } from "#backends/opencode/backend.ts";
import { makePiBackend } from "#backends/pi/backend.ts";

interface BackendOptions {
	readonly cwd: string;
	readonly skills: string;
	readonly plugin: string;
}
export const backends = (options: BackendOptions) =>
	Effect.gen(function* () {
		const registered = new Map<string, AgentBackend>();
		const claude = yield* findOnLoginPath("claude");
		if (Option.isSome(claude)) registered.set("claude", yield* claudeBackend({ executable: claude.value, skills: options.skills }));
		else yield* Effect.logWarning("claude: no executable found on the login PATH; backend not registered");
		const codex = yield* findOnLoginPath("codex").pipe(Effect.flatMap(codexCommand));
		if (Option.isSome(codex)) registered.set("codex", yield* makeCodexBackend({ ...options, command: codex.value }));
		else yield* Effect.logWarning("codex: no executable found on the login PATH or in the ChatGPT app; backend not registered");
		const opencode = yield* findOnLoginPath("opencode");
		if (Option.isSome(opencode)) registered.set("opencode", yield* makeOpencodeBackend({ ...options, command: opencode.value }));
		else yield* Effect.logWarning("opencode: no executable found on the login PATH; backend not registered");
		registered.set("pi", makePiBackend(options));
		return registered;
	});
