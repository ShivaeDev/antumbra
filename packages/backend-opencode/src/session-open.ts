import type { BackendFailure, OpenSessionOptions } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, Schema } from "effect";
import { opencodeFailure } from "#failure.ts";
import { rawOf } from "#mapping.ts";
import { SessionResponse } from "#protocol.ts";
import type { OpencodeServer } from "#server.ts";

const decodeSession = Schema.decodeUnknownOption(SessionResponse);

// OpenCode picks its own model and effort, so a voyage's choice is reported once rather than silently dropped.
const noteIgnoredSettings = (options: OpenSessionOptions): Effect.Effect<void> => {
	const chosen = [
		...Option.match(options.model, { onNone: (): ReadonlyArray<string> => [], onSome: (model) => [`model ${model}`] }),
		...Option.match(options.effort, { onNone: (): ReadonlyArray<string> => [], onSome: (effort) => [`effort ${effort}`] }),
	];
	return chosen.length === 0 ? Effect.void : Effect.logInfo(`opencode: ignoring the voyage's ${chosen.join(" and ")}; this backend chooses its own`);
};

export const openSession = (server: OpencodeServer, options: OpenSessionOptions): Effect.Effect<readonly [string, unknown], BackendFailure> => {
	const query = { directory: options.cwd };
	const opened: Effect.Effect<readonly [string, unknown], BackendFailure> = Option.match(options.resume, {
		onNone: () => server.post({ body: {}, path: "/session", query }).pipe(Effect.map((response) => ["POST /session", response] as const)),
		onSome: (sessionId) =>
			server
				.get({ body: undefined, path: `/session/${sessionId}`, query })
				.pipe(Effect.map((response) => [`GET /session/${sessionId}`, response] as const)),
	});
	return Effect.andThen(noteIgnoredSettings(options), opened);
};

export const sessionIdOf = (route: string, response: unknown): Effect.Effect<string, BackendFailure> =>
	Option.match(decodeSession(response), {
		onNone: () => Effect.fail(opencodeFailure(`${route} returned no session`)),
		onSome: ({ id }) => Effect.succeed(id),
	});

export const sessionOpened = (route: string, response: unknown, sessionId: string): AgentEvent => ({
	nativeRef: sessionId,
	raw: rawOf(route, response),
	type: "session.opened",
});
