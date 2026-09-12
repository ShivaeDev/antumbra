import { fileURLToPath } from "node:url";
import { opencodeBackend } from "@antumbra/runner-backends-opencode/backend.ts";
import { makeOpencodeServer } from "@antumbra/runner-backends-opencode/server.ts";
import { makeToolSessions } from "@antumbra/runner-backends-opencode/tool-sessions.ts";
import type { ToolDefinition } from "@antumbra/runner-ports/tools.ts";
import { Effect } from "effect";
import { ChildProcessSpawner } from "effect/unstable/process";
import { serveOpencode } from "#backends/opencode/adapters/serve.ts";
import { serveToolRequests } from "#backends/opencode/adapters/tool-endpoint.ts";
import { answerToolRequest } from "#backends/opencode/adapters/tool-server.ts";

export interface OpencodeOptions {
	readonly command: string;
	readonly cwd: string;
	readonly plugin?: string;
	readonly skills: string;
}

export const makeOpencodeBackend = Effect.fn("OpenCode.makeBackend")(function* (options: OpencodeOptions) {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	const plugin = options.plugin ?? fileURLToPath(new URL("./plugin/caller-session.js", import.meta.url));
	const liveServer = Effect.fn("OpenCode.sessionServer")(function* (definitions: ReadonlyArray<ToolDefinition>, constrained: boolean) {
		const sessions = makeToolSessions(definitions.map((tool) => tool.name));
		const tools = yield* serveToolRequests(answerToolRequest(definitions, sessions));
		return yield* makeOpencodeServer(
			Effect.provideService(serveOpencode({ ...options, constrained, plugin, tools }), ChildProcessSpawner.ChildProcessSpawner, spawner),
			sessions,
		);
	});
	return opencodeBackend({
		catalogue: liveServer([], false),
		open: (session) => liveServer(session.tools, session.constrainedPrompt !== undefined),
	});
});
