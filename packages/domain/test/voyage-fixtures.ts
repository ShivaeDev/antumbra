import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect } from "@effect/vitest";
import { Effect, Option, Schedule, Stream } from "effect";
import { AgentDomain } from "#domain.ts";

export const PATIENCE = { maxAlive: 4, patienceMillis: 50 };

const TERMINAL: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
]);

export const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 3000 }))),
	);

export const aliveAgent = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const agent = Option.getOrThrow(
			yield* db.Agent.where({ id: agentId }).first(),
		);
		expect(agent.status).toBe("alive");
		return agent;
	});

export const openReefVoyage = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	return yield* domain.voyages.open({
		backend: "scripted",
		context: "the reef is uncharted",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
});

// why: one alpha and two dependents is the smallest graph that shows both
// gating and fan-out — every dispatcher test builds the same chain so the
// assertions differ only in the policy under test.
export const chain = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const voyage = yield* openReefVoyage;
	const charter = (title: string, dependsOn: ReadonlyArray<string>) =>
		domain.voyages.charterPiece({
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
	yield* domain.voyages.launch(alpha.id);
	yield* domain.voyages.launch(bravo.id);
	yield* domain.voyages.launch(charlie.id);
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
		const domain = yield* AgentDomain;
		yield* domain.voyages.landReport({
			body: `${title} landed`,
			pieceId,
			title,
		});
	});

export const assignedPieces = Effect.gen(function* () {
	const db = yield* Database;
	return (yield* db.PieceAgent.all()).map((row) => row.pieceId);
});

export const retireOneAlive = Effect.gen(function* () {
	const db = yield* Database;
	const kernel = yield* Kernel;
	const domain = yield* AgentDomain;
	const alive = yield* db.Agent.where({ status: "alive" }).all();
	const submission = yield* kernel.submit(domain.retire, {
		agentId: alive[0]?.id ?? "",
	});
	return yield* submission.changes.pipe(
		Stream.takeUntil((status) => TERMINAL.has(status)),
		Stream.runLast,
	);
});
