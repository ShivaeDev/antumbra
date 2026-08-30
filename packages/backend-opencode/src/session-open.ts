import type { BackendFailure, OpenSessionOptions } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, Schema } from "effect";
import { opencodeFailure } from "#failure.ts";
import { rawOf } from "#mapping.ts";
import { SessionResponse } from "#protocol.ts";
import type { OpencodeServer } from "#server.ts";

const decodeSession = Schema.decodeUnknownOption(SessionResponse);

export const openSession = (server: OpencodeServer, options: OpenSessionOptions): Effect.Effect<readonly [string, unknown], BackendFailure> => {
	const query = { directory: options.cwd };
	return Option.match(options.resume, {
		onNone: () => server.post({ body: {}, path: "/session", query }).pipe(Effect.map((response) => ["POST /session", response] as const)),
		onSome: (sessionId) =>
			server
				.get({ body: undefined, path: `/session/${sessionId}`, query })
				.pipe(Effect.map((response) => [`GET /session/${sessionId}`, response] as const)),
	});
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
