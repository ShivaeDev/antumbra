import { makeToolSessions } from "@antumbra/runner-backends-opencode/tool-sessions.ts";
import { it } from "@effect/vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { Effect } from "effect";
import { expect, vi } from "vitest";
import { answerToolRequest } from "#backends/opencode/adapters/tool-server.ts";

it.live("keeps a pending call alive beyond its MCP timeout through supported progress resets", () =>
	Effect.gen(function* () {
		vi.useFakeTimers();
		const sessions = makeToolSessions(["read_board"]);
		let finish = (_outcome: { ok: boolean; text: string }) => {};
		const pending = new Promise<{ ok: boolean; text: string }>((resolve) => {
			finish = resolve;
		});
		sessions.remember("ses_crew", new Map([["read_board", () => pending]]));
		const answer = answerToolRequest([{ name: "read_board", description: "read", inputSchema: { type: "object" } }], sessions);
		const transport = new StreamableHTTPClientTransport(new URL("http://localhost/tools"), {
			fetch: (input, init) => answer(new Request(input, init)),
		});
		const client = new Client({ name: "test", version: "1" });
		try {
			const stateless: Omit<StreamableHTTPClientTransport, "sessionId"> = transport;
			yield* Effect.promise(() => client.connect(stateless));
			const progress: Array<number> = [];
			const outcome = client.callTool({ name: "read_board", arguments: { callerSession: "ses_crew", callerCall: "call_1" } }, CallToolResultSchema, {
				timeout: 60_000,
				resetTimeoutOnProgress: true,
				onprogress: (value) => {
					progress.push(value.progress);
				},
			});
			yield* Effect.promise(() => vi.advanceTimersByTimeAsync(0));
			expect(progress).toEqual([0]);
			yield* Effect.promise(() => vi.advanceTimersByTimeAsync(180_000));
			expect(progress.length).toBeGreaterThanOrEqual(5);
			finish({ ok: true, text: "read after reconnect" });
			expect(yield* Effect.promise(() => outcome)).toMatchObject({ content: [{ type: "text", text: "read after reconnect" }], isError: false });
		} finally {
			yield* Effect.promise(() => client.close());
			vi.useRealTimers();
		}
	}),
);
