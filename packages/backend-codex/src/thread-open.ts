import type { BackendFailure, DirectTool, OpenSessionOptions } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, Schema } from "effect";
import { codexFailure } from "#failure.ts";
import { rawOf } from "#mapping.ts";
import { ThreadResponse } from "#protocol.ts";
import type { CodexServer } from "#server.ts";

// why: the ruled v0 policy — writes confined to the moorage by codex's own
// sandbox, escapes judged by codex's literal auto mode (an LLM reviewer),
// never `approvalPolicy: never` and never a sandbox bypass.
const THREAD_POLICY = {
	approvalsReviewer: "auto_review",
	sandbox: "workspace-write",
};

// why: the same name, description, and JSON Schema every backend is handed,
// in the shape codex takes them. A thread opened with no tools sends no key at
// all, so a session that acts through nothing looks exactly as it did.
const dynamicTools = (tools: ReadonlyArray<DirectTool>) =>
	tools.length === 0
		? {}
		: {
				dynamicTools: tools.map((tool) => ({
					description: tool.description,
					inputSchema: tool.inputSchema,
					name: tool.name,
					type: "function",
				})),
			};

const decodeThread = Schema.decodeUnknownOption(ThreadResponse);

// why: attaching to a thread mutates it — codex clears a sub-agent's goal when
// a client resumes it — so a node is read by listening and never by taking it
// over. The refusal is here, at the seam where a thread id becomes a live
// attachment, so a caller holding a child's reference cannot reach the wire
// with it however it came by the id.
const attachable = (server: CodexServer, threadId: string): Effect.Effect<string, BackendFailure> =>
	server.threads.isNode(threadId)
		? Effect.fail(codexFailure(`thread ${threadId} is a subsession of a running session; subsessions are read from the stream, never attached`))
		: Effect.succeed(threadId);

export const openThread = (server: CodexServer, options: OpenSessionOptions): Effect.Effect<readonly [string, unknown], BackendFailure> =>
	Option.match(options.resume, {
		onNone: () =>
			server
				.request("thread/start", {
					cwd: options.cwd,
					...dynamicTools(options.tools),
					...THREAD_POLICY,
				})
				.pipe(Effect.map((response) => ["thread/start", response] as const)),
		// why: resume sends no specifications — codex keeps them in the thread's
		// rollout — but the running process still has to be able to answer a call,
		// so the tools are registered again either way.
		onSome: (threadId) =>
			attachable(server, threadId).pipe(
				Effect.flatMap((attached) =>
					server.request("thread/resume", {
						cwd: options.cwd,
						threadId: attached,
						...THREAD_POLICY,
					}),
				),
				Effect.map((response) => ["thread/resume", response] as const),
			),
	});

export const threadIdOf = (method: string, response: unknown): Effect.Effect<string, BackendFailure> =>
	Option.match(decodeThread(response), {
		onNone: () => Effect.fail(codexFailure(`${method} returned no thread`)),
		onSome: ({ thread }) => Effect.succeed(thread.id),
	});

export const threadOpened = (method: string, response: unknown, threadId: string): AgentEvent => ({
	nativeRef: threadId,
	raw: rawOf(method, response),
	type: "session.opened",
});
