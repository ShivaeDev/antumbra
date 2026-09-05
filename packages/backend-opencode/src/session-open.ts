import type { BackendFailure, OpenSessionOptions } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, Schema } from "effect";
import { wireName } from "#adapters/tool-server.ts";
import { opencodeFailure } from "#failure.ts";
import { rawOf } from "#mapping.ts";
import { SessionResponse } from "#protocol.ts";
import type { OpencodeServer } from "#server.ts";

const decodeSession = Schema.decodeUnknownOption(SessionResponse);

export interface PromptSettings {
	readonly model?: { readonly modelID: string; readonly providerID: string };
	readonly variant?: string;
}

const namedModel = (model: string): Effect.Effect<PromptSettings, BackendFailure> => {
	const separator = model.indexOf("/");
	return separator === -1
		? Effect.fail(opencodeFailure(`model ${JSON.stringify(model)} names no provider; opencode reads a model as provider/model`))
		: Effect.succeed({ model: { modelID: model.slice(separator + 1), providerID: model.slice(0, separator) } });
};

export const promptSettings = (options: OpenSessionOptions): Effect.Effect<PromptSettings, BackendFailure> => {
	const variant = Option.match(options.effort, { onNone: (): PromptSettings => ({}), onSome: (effort) => ({ variant: effort }) });
	return Option.match(options.model, {
		onNone: () => Effect.succeed(variant),
		onSome: (model) => Effect.map(namedModel(model), (named) => ({ ...named, ...variant })),
	});
};

const withoutOtherTools = (server: OpencodeServer, tools: OpenSessionOptions["tools"]) => {
	const given = new Set(tools.map((tool) => tool.name));
	return server.tools.names.filter((name) => !given.has(name)).map((name) => ({ action: "deny", pattern: "*", permission: wireName(name) }));
};

export const openSession = (server: OpencodeServer, options: OpenSessionOptions): Effect.Effect<readonly [string, unknown], BackendFailure> => {
	const query = { directory: options.cwd };
	return Option.match(options.resume, {
		onNone: () =>
			server
				.post({ body: { permission: withoutOtherTools(server, options.tools) }, path: "/session", query })
				.pipe(Effect.map((response) => ["POST /session", response] as const)),
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
