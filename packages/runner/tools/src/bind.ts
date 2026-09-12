import type { ToolSet } from "@antumbra/platform-runner/tools.ts";
import type { DirectTool } from "@antumbra/runner-ports/tools.ts";
import { Effect } from "effect";
import { ToolDispatch } from "#dispatch.ts";

export const bind = Effect.fn("RunnerTools.bind")(function* (sessionId: string, set: ToolSet) {
	const dispatch = yield* ToolDispatch;
	return set.tools.map(
		(tool): DirectTool => ({
			...tool,
			call: (callId, input) => dispatch.call({ callId, input, name: tool.name, sessionId }),
		}),
	);
});
