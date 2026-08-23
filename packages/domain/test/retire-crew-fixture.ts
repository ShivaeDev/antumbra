import { Kernel } from "@antumbra/kernel";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { laterBy } from "#test/session-idle-fixture.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";

export const MINUTE_MILLIS = 60_000;

const REEF = {
	backend: "scripted",
	context: "the reef is uncharted",
	name: "Chart the reef",
	northStar: "every shoal is known",
};

// why: one voyage and one piece is the whole of what these rehearsals need —
// what the sweep reads is a landed outcome, a claim row and a session that has
// gone quiet, and none of those wants a graph around it.
export const chartered = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const voyage = yield* domain.voyages.open(REEF);
	const piece = yield* domain.voyages.charterPiece({
		charter: "sound the northern shoals",
		dependsOn: [],
		expectation: "the depths are recorded",
		role: "hand",
		title: "soundings",
		voyageId: voyage.id,
	});
	return { pieceId: piece.id, voyageId: voyage.id };
});

export const handFor = (
	agentId: string,
	pieceId: string,
	voyageId: string,
): SpawnFields => ({
	agentId,
	backend: "scripted",
	charter: "sound the northern shoals",
	pieceId,
	role: "hand",
	runner: "local",
	sessionId: `session-${agentId}`,
	voyageId,
});

export const born = (fields: SpawnFields) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const submission = yield* kernel.submit(domain.spawn, fields);
		expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
	});

export const landed = (pieceId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		yield* domain.voyages.landReport({
			body: "the depths are recorded",
			pieceId,
			title: "soundings",
		});
	});

const retirePass = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const demand = domain.intentDemands.find(
		(registration) => registration.tag === "agent/retire",
	);
	return demand === undefined
		? yield* Effect.die("no retire demand is registered")
		: demand.pass;
});

// why: the pass the app runs on its own timer, run by hand and against a clock
// further on — which is the same fact as the rest having gone by, for
// everything that reads the time rather than sleeping on it.
export const sweptAt = (millis: number) =>
	Effect.flatMap(retirePass, (pass) => laterBy(millis, pass));

// why: the same pass with the clock left where it is — the next one the app
// would have run anyway. What it proves is that nothing had to be waited out.
export const swept = Effect.flatten(retirePass);
