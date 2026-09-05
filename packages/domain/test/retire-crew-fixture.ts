import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Reports } from "@antumbra/reports";
import { Voyages } from "@antumbra/voyages";
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

export const chartered = Effect.gen(function* () {
	const pieces = yield* Pieces;
	const voyageRecords = yield* Voyages;
	const voyage = yield* voyageRecords.open(REEF);
	const piece = yield* pieces.charter({
		charter: "sound the northern shoals",
		dependsOn: [],
		expectation: "the depths are recorded",
		role: "hand",
		title: "soundings",
		voyageId: voyage.id,
	});
	return { pieceId: piece.id, voyageId: voyage.id };
});

export const handFor = (agentId: string, pieceId: string, voyageId: string): SpawnFields => ({
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
		return fields.sessionId;
	});

export const landed = (pieceId: string) =>
	Effect.gen(function* () {
		const reports = yield* Reports;
		yield* reports.land({
			body: "the depths are recorded",
			pieceId,
			title: "soundings",
		});
	});

const retirePass = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const demand = domain.intentDemands.find((registration) => registration.tag === "agent/retire");
	return demand === undefined ? yield* Effect.die("no retire demand is registered") : demand.pass;
});

export const sweptAt = (millis: number) => Effect.flatMap(retirePass, (pass) => laterBy(millis, pass));

export const swept = Effect.flatten(retirePass);

export const awaitRetirement = Effect.gen(function* () {
	const db = yield* Database;
	const kernel = yield* Kernel;
	const intents = yield* db.Intent.where({ tag: "agent/retire" }).all();
	for (const intent of intents) {
		expect(yield* untilTerminal(kernel.changes(intent.id))).toBe("succeeded");
	}
});
