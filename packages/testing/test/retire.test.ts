import { AgentDomain } from "@antumbra/domain";
import { isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";

const AGENT = "agent-app-retired";

it.effectApp("runs a Domain intent through the Kernel", { clock: "live" }, function* ({ db }) {
	yield* db.Agent.create({
		charter: "sound the northern shoals",
		currentSessionId: null,
		id: AGENT,
		role: "hand",
		status: "alive",
	});

	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const submission = yield* kernel.submit(domain.retire, { agentId: AGENT });
	const status = yield* submission.changes.pipe(
		Stream.takeUntil(isTerminalIntentStatus),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
		Effect.orDie,
	);

	expect(status).toBe("succeeded");
	expect(Option.getOrThrow(yield* db.Agent.where({ id: AGENT }).first()).status).toBe("retired");
});
