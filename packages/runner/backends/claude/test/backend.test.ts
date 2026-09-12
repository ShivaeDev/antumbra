import type { OpenSessionOptions } from "@antumbra/runner-ports/backend.ts";
import { noSessionAudit } from "@antumbra/runner-ports/session-audit.ts";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { makeClaudeBackend } from "#backend.ts";
import { ClaudeRuntime, type RawSessionRequest } from "#runtime.ts";

it.effect("resume, tool binding, queue and steer retain their own boundaries until close", () =>
	Effect.gen(function* () {
		const opened: RawSessionRequest[] = [];
		const delivered: { readonly kind: string; readonly text: string }[] = [];
		let closed = false;
		const runtime = Layer.succeed(ClaudeRuntime, {
			audit: noSessionAudit,
			listModels: Effect.succeed([]),
			open: (request) =>
				Effect.acquireRelease(
					Effect.sync(() => {
						opened.push(request);
						return {
							interrupt: () => Promise.resolve(),
							queue: (text: string) =>
								Effect.sync(() => {
									delivered.push({ kind: "queue", text });
								}),
							steer: (text: string) =>
								Effect.sync(() => {
									delivered.push({ kind: "steer", text });
								}),
							subscribe: () => {},
						};
					}),
					() =>
						Effect.sync(() => {
							closed = true;
						}),
				),
		});
		const session: OpenSessionOptions = {
			cwd: "/crew",
			effort: Option.some("high"),
			model: Option.some("claude-model"),
			resume: Option.some("native-conversation"),
			sessionId: "antumbra-session",
			tools: [
				{ name: "report", description: "Report", inputSchema: { type: "object" }, call: (callId) => Effect.succeed({ ok: true, text: callId }) },
			],
		};
		yield* Effect.scoped(
			Effect.gen(function* () {
				const backend = yield* makeClaudeBackend;
				const handle = yield* backend.openSession(session);
				expect(yield* handle.nativeRef).toEqual(session.resume);
				yield* handle.queue({ parts: [{ type: "text", text: "later" }] });
				yield* handle.steer({ parts: [{ type: "text", text: "now" }] });
				const request = opened[0];
				expect(request?.session).toBe(session);
				expect(request?.effort).toBe("high");
				expect(delivered).toEqual([
					{ kind: "queue", text: "later" },
					{ kind: "steer", text: "now" },
				]);
				expect(closed).toBe(false);
			}).pipe(Effect.provide(runtime)),
		);
		expect(closed).toBe(true);
	}),
);
