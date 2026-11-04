import { Effect } from "effect";
import type { connectRunner, LogEntry } from "#runner.ts";

type Runner = Effect.Success<ReturnType<typeof connectRunner>>;

export const nextSessionOperation = Effect.fn("SmoothingRunner.nextSessionOperation")(function* (runner: Runner, entries: readonly LogEntry[]) {
	while (true) {
		const operation = yield* runner.next;
		if (operation.type === "Start" || operation.type === "Stop") return operation;
		if (operation.type === "Plan")
			yield* runner.reply(operation.requestId, { type: "MooragePlanned", plan: { root: `/smoother/${operation.agentId}`, berths: [] } });
		else if (operation.type === "ReadLog")
			yield* runner.reply(operation.requestId, { type: "LogRead", entries: entries.filter((entry) => entry.cursor > operation.after) });
		else yield* runner.reply(operation.requestId, { type: "Accepted" });
	}
});
