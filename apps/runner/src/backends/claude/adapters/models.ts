import { type ModelInfo, query } from "@anthropic-ai/claude-agent-sdk";
import { InputQueue } from "@antumbra/runner-backends-claude/adapters/input-queue.ts";
import type { ModelChoice } from "@antumbra/runner-ports/backend.ts";
import { Effect } from "effect";

const choiceOf = (model: ModelInfo): ModelChoice => ({
	efforts: model.supportedEffortLevels ?? [],
	id: model.value,
	isDefault: false,
	name: model.displayName,
});

// The catalog is read over a session's control channel, so a session opens with a prompt that never speaks and closes once the answer is back.
export const listClaudeModels = (executable: string): Effect.Effect<ReadonlyArray<ModelChoice>> =>
	Effect.acquireUseRelease(
		Effect.sync(() => {
			const input = new InputQueue(() => {});
			return { input, live: query({ options: { pathToClaudeCodeExecutable: executable }, prompt: input.stream() }) };
		}),
		({ live }) => Effect.promise(() => live.supportedModels()),
		({ input, live }) =>
			Effect.sync(() => {
				input.close();
				live.close();
			}),
	).pipe(Effect.map((models) => models.map(choiceOf)));
