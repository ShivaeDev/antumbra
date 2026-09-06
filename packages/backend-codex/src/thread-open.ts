import type { BackendFailure, DirectTool, OpenSessionOptions } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { Effect, Option, Schema } from "effect";
import { type AgentSettings, chosenModel } from "#agent-settings.ts";
import { codexFailure } from "#failure.ts";
import { rawOf } from "#mapping.ts";
import { ThreadResponse } from "#protocol.ts";
import type { CodexServer } from "#server.ts";

const threadPolicy = (options: OpenSessionOptions) => ({
	approvalsReviewer: "auto_review",
	...(options.constrainedPrompt === undefined
		? { sandbox: "workspace-write" }
		: { baseInstructions: options.constrainedPrompt, sandbox: "read-only" }),
});

// Codex omits `dynamicTools` when a thread has no tools.
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

// Resuming a Codex sub-agent clears its goal.
const attachable = (server: CodexServer, threadId: string): Effect.Effect<string, BackendFailure> =>
	server.threads.isNode(threadId)
		? Effect.fail(codexFailure(`thread ${threadId} is a subsession of a running session; subsessions are read from the stream, never attached`))
		: Effect.succeed(threadId);

export const openThread = (
	server: CodexServer,
	options: OpenSessionOptions,
	settings: AgentSettings,
): Effect.Effect<readonly [string, unknown], BackendFailure> =>
	Option.match(options.resume, {
		onNone: () =>
			server
				.request("thread/start", {
					cwd: options.cwd,
					...dynamicTools(options.tools),
					...chosenModel(settings),
					...threadPolicy(options),
				})
				.pipe(Effect.map((response) => ["thread/start", response] as const)),
		// Codex stores resume specifications in the rollout; resumed processes still need live tool registrations.
		onSome: (threadId) =>
			attachable(server, threadId).pipe(
				Effect.flatMap((attached) =>
					server.request("thread/resume", {
						cwd: options.cwd,
						threadId: attached,
						...chosenModel(settings),
						...threadPolicy(options),
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
