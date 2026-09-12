import type { OpenSessionOptions } from "@antumbra/runner-ports/backend.ts";
import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { afterEach, vi } from "vitest";
import * as serving from "#backends/opencode/adapters/serve.ts";
import { makeOpencodeBackend } from "#backends/opencode/backend.ts";

const session = (name: string): OpenSessionOptions => ({
	cwd: "/moorage",
	effort: Option.none(),
	model: Option.none(),
	resume: Option.none(),
	sessionId: name,
	tools: [{ name, description: name, inputSchema: { type: "object" }, call: () => Effect.succeed({ ok: true, text: name }) }],
});

afterEach(() => vi.restoreAllMocks());

it.effect("gives each provider process an endpoint listing only its frozen session tools", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const endpoints: Array<string> = [];
			vi.spyOn(serving, "serveOpencode").mockImplementation((options) =>
				Effect.sync(() => {
					endpoints.push(options.tools);
					return {
						close: () => {},
						get: () => Promise.resolve({}),
						post: () => Promise.resolve({ directory: "/moorage", id: `native_${endpoints.length}` }),
						onEvent: () => {},
						onExit: () => {},
					};
				}),
			);
			const backend = yield* makeOpencodeBackend({ command: "opencode", cwd: "/moorage", skills: "/skills" }).pipe(
				Effect.provide(NodeServices.layer),
			);
			yield* backend.openSession(session("read_board"));
			yield* backend.openSession(session("write_board"));
			const lists = yield* Effect.forEach(endpoints, (url) =>
				Effect.promise(() =>
					fetch(url, {
						method: "POST",
						headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
						body: JSON.stringify({ id: 1, jsonrpc: "2.0", method: "tools/list", params: {} }),
					}),
				).pipe(Effect.flatMap((response) => Effect.promise(() => response.text()))),
			);
			expect(lists[0]).toContain('"name":"read_board"');
			expect(lists[0]).not.toContain('"name":"write_board"');
			expect(lists[1]).toContain('"name":"write_board"');
			expect(lists[1]).not.toContain('"name":"read_board"');
		}),
	),
);
