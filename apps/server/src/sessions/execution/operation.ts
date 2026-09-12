import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import type { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { wakeWords } from "@antumbra/platform-prompts/wake.ts";
import type { Input } from "@antumbra/platform-runner/input.ts";
import type { Operation } from "@antumbra/platform-runner/operations.ts";
import { Effect } from "effect";
import { holdOperation } from "#sessions/execution/hold.ts";
import { SessionExecution } from "#sessions/execution/service.ts";
export const runnerOperation = Effect.fn("Sessions.runnerOperation")(function* (
	operation: typeof sessionOperation.Row.Type,
	root: typeof session.Row.Type,
	attached: boolean,
) {
	const edge = yield* SessionExecution;
	const identity = { requestId: operation.id, sessionId: root.id };
	switch (operation.kind) {
		case "interrupt":
			return { type: "Interrupt", ...identity } satisfies Operation;
		case "sleep":
			return { type: "Sleep", ...identity } satisfies Operation;
		case "stop":
			return { type: "Stop", ...identity, reason: operation.reason } satisfies Operation;
		case "wake":
		case "steer": {
			const input: Input =
				operation.inputId === null
					? { id: operation.id, parts: [{ type: "text", text: operation.reason.trim() === "" ? wakeWords : operation.reason }] }
					: yield* edge.input(operation.inputId, root.id);
			if (attached) return { type: "Deliver", ...identity, act: "steer", input } satisfies Operation;
			if (root.nativeRef === null) {
				yield* holdOperation(operation.id, "The provider conversation has no native resume reference");
				return null;
			}
			return { type: "Wake", ...identity, nativeRef: root.nativeRef, options: yield* edge.options(root), instruction: input } satisfies Operation;
		}
	}
});
