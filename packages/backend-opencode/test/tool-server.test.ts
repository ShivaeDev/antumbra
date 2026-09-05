import type { DirectTool } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { serveToolRequests } from "#adapters/tool-endpoint.ts";
import { answerToolRequest } from "#adapters/tool-server.ts";
import { servedTools } from "#session-tools.ts";
import { makeToolSessions, type ToolSessions } from "#tool-sessions.ts";

const NO_ARGUMENTS = { additionalProperties: false, properties: {}, required: [], type: "object" };

const tool = (name: string, said: string): DirectTool => ({
	call: (args) => Effect.succeed({ ok: true, text: `${said} ${JSON.stringify(args)}` }),
	description: `${name}, for the tests only`,
	inputSchema: NO_ARGUMENTS,
	name,
});

const UNION = [tool("read_board", "read"), tool("write_board", "wrote"), tool("rule_on", "ruled")];

const listening = (sessions: ToolSessions) => serveToolRequests(answerToolRequest(UNION, sessions));

const remember = (sessions: ToolSessions, session: string, tools: ReadonlyArray<DirectTool>) =>
	Effect.map(servedTools(tools), (served) => sessions.remember(session, served));

const asked = (url: string, method: string, params: unknown): Effect.Effect<unknown> =>
	Effect.promise(() =>
		fetch(url, {
			body: JSON.stringify({ id: 1, jsonrpc: "2.0", method, params }),
			headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
			method: "POST",
		}),
	).pipe(Effect.flatMap((response) => Effect.promise((): Promise<unknown> => response.json())));

const called = (url: string, name: string, args: Record<string, unknown>) => asked(url, "tools/call", { arguments: args, name });

it.effect("lists every tool Antumbra defines, with the schema the tool carries", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const url = yield* listening(makeToolSessions(UNION.map((each) => each.name)));
			expect(yield* asked(url, "tools/list", {})).toMatchObject({
				result: {
					tools: [
						{ description: "read_board, for the tests only", inputSchema: NO_ARGUMENTS, name: "read_board" },
						{ name: "write_board" },
						{ name: "rule_on" },
					],
				},
			});
		}),
	),
);

it.effect("routes a call to the tool of the session that made it", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const sessions = makeToolSessions(UNION.map((each) => each.name));
			const url = yield* listening(sessions);
			yield* remember(sessions, "ses_captain", [tool("read_board", "the captain read")]);
			yield* remember(sessions, "ses_crew", [tool("read_board", "the crew read")]);
			expect(yield* called(url, "read_board", { callerSession: "ses_crew", since: 3 })).toMatchObject({
				result: { content: [{ text: 'the crew read {"since":3}', type: "text" }], isError: false },
			});
		}),
	),
);

it.effect("answers an error result when the calling session is not open", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const url = yield* listening(makeToolSessions(UNION.map((each) => each.name)));
			expect(yield* called(url, "read_board", { callerSession: "ses_gone" })).toMatchObject({
				result: { content: [{ text: "antumbra serves no open session ses_gone", type: "text" }], isError: true },
			});
		}),
	),
);

it.effect("answers an error result when the session was given no such tool", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const sessions = makeToolSessions(UNION.map((each) => each.name));
			const url = yield* listening(sessions);
			yield* remember(sessions, "ses_crew", [tool("read_board", "the crew read")]);
			expect(yield* called(url, "rule_on", { callerSession: "ses_crew" })).toMatchObject({
				result: { content: [{ text: "session ses_crew was given no tool named rule_on", type: "text" }], isError: true },
			});
		}),
	),
);

it.effect("answers an error result when the call names no calling session", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const sessions = makeToolSessions(UNION.map((each) => each.name));
			const url = yield* listening(sessions);
			yield* remember(sessions, "ses_crew", [tool("read_board", "the crew read")]);
			expect(yield* called(url, "read_board", {})).toMatchObject({
				result: {
					content: [{ text: "the call named no callerSession, so antumbra cannot tell which session is asking", type: "text" }],
					isError: true,
				},
			});
		}),
	),
);
