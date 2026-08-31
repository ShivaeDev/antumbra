import { AgentDomain } from "@antumbra/domain";
import { type IntentStatus, isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { it } from "@antumbra/testing";
import type { ScriptedBackend } from "@antumbra/testing-runtime";
import { expect } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";

const terminalStatus = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow), Effect.orDie);

const standDown = (scripted: ScriptedBackend, sessionId: string) =>
	Effect.gen(function* () {
		const session = yield* scripted.session(sessionId);
		const tool = session?.tools.find((candidate) => candidate.name === "stand_down");
		if (tool === undefined) {
			return yield* Effect.die(`the session has no stand_down tool: ${sessionId}`);
		}
		yield* tool.call(undefined);
	});

it.effectApp("an abandoned piece's crew is retired on the very next pass", { clock: "live" }, function* ({ db, scripted }) {
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const voyage = yield* domain.voyages
		.open({
			backend: "scripted",
			context: "the reef is uncharted",
			name: "Chart the reef",
			northStar: "every shoal is known",
		})
		.pipe(Effect.orDie);
	const piece = yield* domain.voyages
		.charterPiece({
			charter: "sound the northern shoals",
			dependsOn: [],
			expectation: "the depths are recorded",
			role: "hand",
			title: "soundings",
			voyageId: voyage.id,
		})
		.pipe(Effect.orDie);
	const crewed = yield* domain.voyages.workNow(piece.id).pipe(Effect.orDie);
	expect(yield* terminalStatus(kernel.changes(crewed.intentId))).toBe("succeeded");
	const session = Option.getOrThrow(yield* db.AgentSession.where({ agentId: crewed.agentId }).first());
	yield* standDown(scripted, session.id);
	yield* domain.voyages.landPieceVerdict(piece.id, "abandoned").pipe(Effect.orDie);
	const demand = Option.getOrThrow(Option.fromUndefinedOr(domain.intentDemands.find((registration) => registration.tag === "agent/retire")));
	yield* demand.pass.pipe(Effect.orDie);
	const demanded = yield* db.Intent.where({ tag: "agent/retire" }).all();
	expect(demanded).toHaveLength(1);
	expect(demanded[0]?.payload).toContain(crewed.agentId);
	const intentId = Option.getOrThrow(Option.fromUndefinedOr(demanded[0]?.id));
	expect(yield* terminalStatus(kernel.changes(intentId))).toBe("succeeded");
	expect(Option.getOrThrow(yield* db.Agent.where({ id: crewed.agentId }).first()).status).toBe("retired");
});
