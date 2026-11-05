import type { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { Effect, Option, Stream } from "effect";
import { Reactivity } from "effect/reactivity/Reactivity";
import { capacityAvailable } from "#sessions/execution/capacity.ts";
import { holdOperation } from "#sessions/execution/hold.ts";
import { runnerOperation } from "#sessions/execution/operation.ts";
export const execute = Effect.fn("Sessions.execute")(function* (operation: typeof sessionOperation.Row.Type) {
	const sessionsService = yield* Sessions;

	const runners = yield* RunnerOperations;
	const root = yield* sessionsService.reading({ id: operation.sessionId }).pipe(Effect.orDie);
	if (root === null || root.status !== "open") return;
	if (!(yield* capacityAvailable(operation, root.backend))) return;
	const reactivity = yield* Reactivity;
	const available = reactivity
		.stream(["runner:connected"], runners.connected)
		.pipe(
			Stream.filter((registrations) => registrations.some((runner) => runner.runnerId === root.runnerId && runner.backends.includes(root.backend))),
		);
	const connected = yield* Stream.runHead(available).pipe(Effect.map(Option.getOrThrow));
	const runner = connected.find((runner) => runner.runnerId === root.runnerId);
	if (runner === undefined) return;
	const current = yield* sessionsService.reading({ id: operation.sessionId }).pipe(Effect.orDie);
	if (current === null || current.status !== "open") return;
	if (!(yield* capacityAvailable(operation, current.backend))) return;
	const wire = yield* runnerOperation(operation, current, current.attached);
	if (wire === null) return;
	const result = yield* runners.execute(runner.runnerId, wire);
	if (result.type === "Refused") yield* holdOperation(operation.id, result.reason);
});
