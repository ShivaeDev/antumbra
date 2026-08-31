import { type AntumbraPlugin, makeBackendCapacityController } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { claudeBackend } from "#backend.ts";
import { classifyClaudeCapacity } from "#capacity.ts";

export { type ClaudeBackendOptions, claudeBackend } from "#backend.ts";

// why: Antumbra drives the CLI the user installed and bundles none — the
// backend is offered only when one is found, because a backend that cannot
// spawn is not a backend.
export const claudePlugin = (): AntumbraPlugin => ({
	activate: (context) =>
		Effect.flatMap(
			context.findExecutable("claude"),
			Option.match({
				onNone: () => Effect.logWarning("claude: no executable found on the login PATH; backend not registered"),
				onSome: (executable) =>
					Effect.flatMap(makeBackendCapacityController(classifyClaudeCapacity), (capacity) =>
						context.registerAgentBackend(claudeBackend({ executable }, capacity)),
					),
			}),
		),
	name: "claude",
});
