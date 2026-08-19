import { Schema } from "effect";
import { type AppProcedure, surface } from "#router-procedure.ts";
import {
	EventQuery,
	Fleet,
	RepoRegistration,
	RepoSummary,
	SessionEvent,
	SightSource,
	SpawnReceipt,
	SpawnRequest,
} from "#sight.ts";

export const sightRoutes = (procedure: AppProcedure) => ({
	fleet: procedure.output(Fleet).query(function* () {
		const sight = yield* SightSource;
		return yield* surface(sight.fleet);
	}),
	fleetFeed: procedure.output(Fleet).subscription(function* () {
		const sight = yield* SightSource;
		return sight.fleetFeed;
	}),
	forgetRepo: procedure
		.input(Schema.Struct({ repoId: Schema.String }))
		.mutation(function* (input) {
			const sight = yield* SightSource;
			yield* surface(sight.forgetRepo(input.repoId));
		}),
	interruptSession: procedure
		.input(Schema.Struct({ sessionId: Schema.String }))
		.mutation(function* (input) {
			const sight = yield* SightSource;
			yield* surface(sight.interrupt(input.sessionId));
		}),
	registerRepo: procedure
		.input(RepoRegistration)
		.output(RepoSummary)
		.mutation(function* (input) {
			const sight = yield* SightSource;
			return yield* surface(sight.registerRepo(input));
		}),
	retireAgent: procedure
		.input(Schema.Struct({ agentId: Schema.String }))
		.mutation(function* (input) {
			const sight = yield* SightSource;
			yield* surface(sight.retire(input.agentId));
		}),
	sendToSession: procedure
		.input(Schema.Struct({ sessionId: Schema.String, text: Schema.String }))
		.mutation(function* (input) {
			const sight = yield* SightSource;
			yield* surface(sight.send(input.sessionId, input.text));
		}),
	sessionEventFeed: procedure
		.input(EventQuery)
		.output(SessionEvent)
		.subscription(function* (input) {
			const sight = yield* SightSource;
			return sight.sessionEventFeed(input);
		}),
	sessionEvents: procedure
		.input(EventQuery)
		.output(Schema.Array(SessionEvent))
		.query(function* (input) {
			const sight = yield* SightSource;
			return yield* surface(sight.sessionEvents(input));
		}),
	spawnAgent: procedure
		.input(SpawnRequest)
		.output(SpawnReceipt)
		.mutation(function* (input) {
			const sight = yield* SightSource;
			return yield* surface(sight.spawn(input));
		}),
});
