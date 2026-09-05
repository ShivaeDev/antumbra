import { type ModelInfo, query } from "@anthropic-ai/claude-agent-sdk";
import { BackendFailure, type ModelChoice } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { InputQueue } from "#adapters/input-queue.ts";

const failure = (detail: unknown) => new BackendFailure({ detail: String(detail), tag: "claude" });

const choiceOf = (model: ModelInfo): ModelChoice => ({
	efforts: model.supportedEffortLevels ?? [],
	id: model.value,
	isDefault: false,
	name: model.displayName,
});

// The catalog is read over a session's control channel, so a session opens with a prompt that never speaks and closes once the answer is back.
export const listClaudeModels = (executable: string): Effect.Effect<ReadonlyArray<ModelChoice>, BackendFailure> =>
	Effect.acquireUseRelease(
		Effect.try({
			catch: failure,
			try: () => {
				const input = new InputQueue(() => {});
				return { input, live: query({ options: { pathToClaudeCodeExecutable: executable }, prompt: input.stream() }) };
			},
		}),
		({ live }) => Effect.tryPromise({ catch: failure, try: () => live.supportedModels() }),
		({ input, live }) =>
			Effect.sync(() => {
				input.close();
				live.close();
			}),
	).pipe(Effect.map((models) => models.map(choiceOf)));
