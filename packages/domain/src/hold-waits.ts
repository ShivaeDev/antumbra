import type { HoldsView, HoldWaiting } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import { readyPieces } from "#dispatch-policy.ts";
import { ExecutionSource } from "#execution/service.ts";
import type { DueWake } from "#mail-delivery/due-wakes.ts";
import { MailDelivery } from "#mail-delivery/service.ts";
import type { DispatchWorld } from "#voyage-rows.ts";

const dispatchWaiting = (world: DispatchWorld, nowMillis: number): ReadonlyArray<HoldWaiting> =>
	readyPieces(world).map((candidate) => ({
		id: candidate.piece.id,
		mail: null,
		title: candidate.piece.title,
		voyage: candidate.voyage.name,
		waitedMillis: nowMillis - (candidate.piece.launchedAt?.getTime() ?? nowMillis),
	}));

const crewedVoyages = Effect.fnUntraced(function* (agentIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const crewed = yield* db.VoyageAgent.where((crew) => crew.agentId.in(agentIds)).all();
	const voyages = yield* db.Voyage.where((voyage) => voyage.id.in(crewed.map((crew) => crew.voyageId))).all();
	const names = new Map(voyages.map((voyage) => [voyage.id, voyage.name] as const));
	return new Map(
		crewed.flatMap((crew) => {
			const name = names.get(crew.voyageId);
			return name === undefined ? [] : [[crew.agentId, name] as const];
		}),
	);
});

const wakeWaiting = Effect.fnUntraced(function* (due: ReadonlyArray<DueWake>) {
	const db = yield* Database;
	const agentIds = due.map((wake) => wake.agentId);
	const agents = yield* db.Agent.where((agent) => agent.id.in(agentIds)).all();
	const roles = new Map(agents.map((agent) => [agent.id, agent.role] as const));
	const voyages = yield* crewedVoyages(agentIds);
	return [...due]
		.sort((left, right) => right.waitedMillis - left.waitedMillis)
		.map(
			(wake) =>
				({
					id: wake.sessionId,
					mail: { count: wake.batch.count, precedence: wake.batch.precedence },
					title: roles.get(wake.agentId) ?? wake.agentId,
					voyage: voyages.get(wake.agentId) ?? null,
					waitedMillis: wake.waitedMillis,
				}) satisfies HoldWaiting,
		);
});

export const makeHoldWaits = Effect.gen(function* () {
	const db = yield* Database;
	const mail = yield* MailDelivery;
	const execution = yield* ExecutionSource;
	return Effect.fnUntraced(function* () {
		const nowMillis = yield* Clock.currentTimeMillis;
		const world = yield* execution.dispatch();
		const wakes = yield* wakeWaiting(yield* mail.dueWakes()).pipe(Effect.provideService(Database, db));
		return {
			queues: [
				{ kind: "dispatch", waiting: dispatchWaiting(world, nowMillis) },
				{ kind: "wake", waiting: wakes },
			],
		} satisfies HoldsView;
	});
});
