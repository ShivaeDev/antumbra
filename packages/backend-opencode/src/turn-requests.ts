import type { BackendFailure } from "@antumbra/plugin-api";
import type { Effect } from "effect";
import type { OpencodeServer } from "#server.ts";

export interface TurnRequests {
	readonly abort: Effect.Effect<unknown, BackendFailure>;
	readonly prompt: (text: string) => Effect.Effect<unknown, BackendFailure>;
}

export const turnRequests = (server: OpencodeServer, sessionId: string, cwd: string): TurnRequests => {
	const query = { directory: cwd };
	return {
		abort: server.post({
			body: {},
			path: `/session/${sessionId}/abort`,
			query,
		}),
		prompt: (text) =>
			server.post({
				body: { parts: [{ text, type: "text" }] },
				path: `/session/${sessionId}/prompt_async`,
				query,
			}),
	};
};
