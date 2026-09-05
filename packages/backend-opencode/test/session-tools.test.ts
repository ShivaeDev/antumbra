import type { DirectTool, OpenSessionOptions } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { makeOpencodeServer } from "#server.ts";
import { openOpencodeSession } from "#session.ts";
import { makeFakeOpencode } from "#test/fake.ts";
import { SESSION } from "#test/frames.ts";
import { makeToolSessions, type ToolSessions } from "#tool-sessions.ts";

const UNION = ["read_board", "rule_on", "write_board"];

const tool = (name: string): DirectTool => ({
	call: () => Effect.succeed({ ok: true, text: name }),
	description: `${name}, for the tests only`,
	inputSchema: { additionalProperties: false, properties: {}, required: [], type: "object" },
	name,
});

const options = (tools: ReadonlyArray<DirectTool>): OpenSessionOptions => ({
	cwd: "/moorage",
	effort: Option.none(),
	model: Option.none(),
	resume: Option.none(),
	sessionId: "antumbra-session",
	tools,
});

const opened = (fake: ReturnType<typeof makeFakeOpencode>, sessions: ToolSessions, tools: ReadonlyArray<DirectTool>) =>
	makeOpencodeServer(fake.connect, sessions).pipe(Effect.flatMap((server) => openOpencodeSession(server, options(tools))));

it.effect("denies the new session every tool of the union it was not given", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const fake = makeFakeOpencode();
			yield* opened(fake, makeToolSessions(UNION), [tool("read_board")]);
			expect(fake.calls[0]?.body).toEqual({
				permission: [
					{ action: "deny", pattern: "*", permission: "antumbra_rule_on" },
					{ action: "deny", pattern: "*", permission: "antumbra_write_board" },
				],
			});
		}),
	),
);

it.effect("serves the session's own tools while it is open and forgets them once it closes", () =>
	Effect.gen(function* () {
		const sessions = makeToolSessions(UNION);
		const fake = makeFakeOpencode();
		yield* Effect.scoped(
			Effect.gen(function* () {
				yield* opened(fake, sessions, [tool("read_board"), tool("write_board")]);
				expect([...Option.getOrThrow(sessions.served(SESSION)).keys()]).toEqual(["read_board", "write_board"]);
			}),
		);
		expect(sessions.served(SESSION)).toEqual(Option.none());
	}),
);
