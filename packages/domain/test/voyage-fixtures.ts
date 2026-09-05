import { isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Reports } from "@antumbra/reports";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Effect, Option, Schedule, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import { type ScriptedBackend, standDown } from "#test/harness.ts";

export const PATIENCE = { maxRunning: 4, patienceMillis: 50 };

export const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 3000 }))),
	);

export const terminalIntent = (intentId: string) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		return yield* kernel.changes(intentId).pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow));
	});

export const aliveAgent = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const agent = Option.getOrThrow(yield* db.Agent.where({ id: agentId }).first());
		expect(agent.status).toBe("alive");
		return agent;
	});

export const sessionIdOf = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.AgentSession.where({ agentId }).all();
		return Option.getOrThrow(Option.fromUndefinedOr(rows[0])).id;
	});

export const openReefVoyage = Effect.gen(function* () {
	const voyageRecords = yield* Voyages;
	return yield* voyageRecords.open({
		backend: "scripted",
		context: "the reef is uncharted",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
});

export const chain = Effect.gen(function* () {
	const pieces = yield* Pieces;
	const voyage = yield* openReefVoyage;
	const charter = (title: string, dependsOn: ReadonlyArray<string>) =>
		pieces.charter({
			charter: `do ${title}`,
			dependsOn,
			expectation: `${title} is landed`,
			role: "hand",
			title,
			voyageId: voyage.id,
		});
	const alpha = yield* charter("alpha", []);
	const bravo = yield* charter("bravo", [alpha.id]);
	const charlie = yield* charter("charlie", [alpha.id]);
	yield* pieces.launch(alpha.id);
	yield* pieces.launch(bravo.id);
	yield* pieces.launch(charlie.id);
	return { alpha, bravo, charlie, voyage };
});

export const stateOf = (voyageId: string, pieceId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const view = Option.getOrThrow(yield* domain.voyages.read(voyageId));
		return view.pieces.find((piece) => piece.id === pieceId)?.state;
	});

export const land = (pieceId: string, title: string) =>
	Effect.gen(function* () {
		const reports = yield* Reports;
		yield* reports.land({
			body: `${title} landed`,
			pieceId,
			title,
		});
	});

export const assignedPieces = Effect.gen(function* () {
	const db = yield* Database;
	return (yield* db.PieceAgent.all()).map((row) => row.pieceId);
});

export const standDownAll = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const alive = yield* db.Agent.where({ status: "alive" }).all();
		yield* Effect.forEach(alive, (agent) => standDown(scripted, agent.id));
	});

export const standDownOneAlive = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const alive = yield* db.Agent.where({ status: "alive" }).all();
		const agentId = alive[0]?.id ?? "";
		yield* standDown(scripted, agentId);
		return agentId;
	});

export const retireOneAlive = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const domain = yield* AgentDomain;
		const agentId = yield* standDownOneAlive(scripted);
		const submission = yield* kernel.submit(domain.retire, { agentId });
		return yield* submission.changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast);
	});
