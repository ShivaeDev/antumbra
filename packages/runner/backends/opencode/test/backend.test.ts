import type { OpenSessionOptions } from "@antumbra/runner-ports/backend.ts";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { opencodeBackend } from "#backend.ts";
import { makeOpencodeServer } from "#server.ts";
import { makeFakeOpencode } from "#test/fake.ts";
import { makeToolSessions } from "#tool-sessions.ts";

const session = (name: string, constrainedPrompt?: string): OpenSessionOptions => ({
	constrainedPrompt,
	cwd: "/moorage",
	effort: Option.none(),
	model: Option.none(),
	resume: Option.none(),
	sessionId: name,
	tools: [{ name, description: name, inputSchema: { type: "object" }, call: () => Effect.succeed({ ok: true, text: name }) }],
});

it.effect("opens each server with that session's frozen tool definitions and constrained prompt", () =>
	Effect.gen(function* () {
		const opened: Array<OpenSessionOptions> = [];
		const acquire = makeOpencodeServer(makeFakeOpencode().connect, makeToolSessions([]));
		const backend = opencodeBackend({
			catalogue: acquire,
			open: (options) => {
				opened.push(options);
				return acquire;
			},
		});
		const plain = session("read_board");
		const narrow = session("write_board", "Smooth this board.");
		yield* backend.openSession(plain);
		yield* backend.openSession(narrow);
		expect(opened).toEqual([plain, narrow]);
	}),
);
