import { makeClaudeBackend } from "@antumbra/runner-backends-claude/backend.ts";
import { ClaudeRuntime } from "@antumbra/runner-backends-claude/runtime.ts";
import { Effect, Layer, Option } from "effect";
import { listClaudeModels } from "#backends/claude/adapters/models.ts";
import { openRawSession } from "#backends/claude/adapters/session.ts";
import { claudeAudit } from "#backends/claude/adapters/subagent-audit.ts";

export interface ClaudeOptions {
	readonly executable: string;
	readonly skills: string;
}

export const claudeRuntimeLayer = (options: ClaudeOptions) =>
	Layer.succeed(ClaudeRuntime, {
		audit: claudeAudit,
		listModels: listClaudeModels(options.executable),
		open: ({ session, effort, call, observeCapacity }) =>
			Effect.acquireRelease(
				Effect.sync(() =>
					openRawSession({
						call,
						constrainedPrompt: session.constrainedPrompt,
						cwd: session.cwd,
						effort,
						executable: options.executable,
						model: session.model,
						observeCapacity,
						resume: Option.getOrUndefined(session.resume),
						skills: options.skills,
						tools: session.tools,
					}),
				),
				(raw) => Effect.sync(() => raw.close()),
			),
	});

export const claudeBackend = (options: ClaudeOptions) => makeClaudeBackend.pipe(Effect.provide(claudeRuntimeLayer(options)));
