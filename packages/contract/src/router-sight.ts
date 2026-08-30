import { Schema } from "effect";
import { Fleet, RepoSummary } from "#fleet.ts";
import { type AppProcedure, surface } from "#router-procedure.ts";
import { SessionImage, SessionImageRequest, SessionInputReceipt, SessionInputRequest } from "#session-inputs.ts";
import { SessionTree } from "#session-tree.ts";
import { EventQuery, RepoRegistration, SessionEvent, SightSource, SituationDraft, SpawnReceipt, SpawnRequest } from "#sight.ts";

export const sightRoutes = (procedure: AppProcedure) => ({
	fleet: procedure.output(Fleet).query(function* () {
		const sight = yield* SightSource;
		return yield* surface(sight.fleet);
	}),
	fleetFeed: procedure.output(Fleet).subscription(function* () {
		const sight = yield* SightSource;
		return sight.fleetFeed;
	}),
	forgetRepo: procedure.input(Schema.Struct({ repoId: Schema.String })).mutation(function* (input) {
		const sight = yield* SightSource;
		yield* surface(sight.forgetRepo(input.repoId));
	}),
	interruptSession: procedure.input(Schema.Struct({ sessionId: Schema.String })).mutation(function* (input) {
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
	retryBackend: procedure.input(Schema.Struct({ backend: Schema.String })).mutation(function* (input) {
		const sight = yield* SightSource;
		yield* surface(sight.retryBackend(input.backend));
	}),
	retireAgent: procedure.input(Schema.Struct({ agentId: Schema.String })).mutation(function* (input) {
		const sight = yield* SightSource;
		yield* surface(sight.retire(input.agentId));
	}),
	retirePieceCrew: procedure.input(Schema.Struct({ pieceId: Schema.String })).mutation(function* (input) {
		const sight = yield* SightSource;
		yield* surface(sight.retireCrew(input.pieceId));
	}),
	sendToSession: procedure.input(Schema.Struct({ sessionId: Schema.String, text: Schema.String })).mutation(function* (input) {
		const sight = yield* SightSource;
		yield* surface(sight.send(input.sessionId, input.text));
	}),
	sendSessionInput: procedure
		.input(SessionInputRequest)
		.output(SessionInputReceipt)
		.mutation(function* (input) {
			return yield* surface((yield* SightSource).sendInput(input));
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
	sessionImage: procedure
		.input(SessionImageRequest)
		.output(SessionImage)
		.query(function* (input) {
			return yield* surface((yield* SightSource).sessionImage(input));
		}),
	sessionTree: procedure
		.input(Schema.Struct({ rootSessionId: Schema.String }))
		.output(SessionTree)
		.query(function* (input) {
			const sight = yield* SightSource;
			return yield* surface(sight.sessionTree(input.rootSessionId));
		}),
	sessionTreeFeed: procedure
		.input(Schema.Struct({ rootSessionId: Schema.String }))
		.output(SessionTree)
		.subscription(function* (input) {
			const sight = yield* SightSource;
			return sight.sessionTreeFeed(input.rootSessionId);
		}),
	situationDraft: procedure
		.input(SituationDraft)
		.output(Schema.String)
		.query(function* (input) {
			const sight = yield* SightSource;
			return yield* surface(sight.situationDraft(input));
		}),
	sleepSession: procedure.input(Schema.Struct({ sessionId: Schema.String })).mutation(function* (input) {
		const sight = yield* SightSource;
		yield* surface(sight.sleep(input.sessionId));
	}),
	spawnAgent: procedure
		.input(SpawnRequest)
		.output(SpawnReceipt)
		.mutation(function* (input) {
			const sight = yield* SightSource;
			return yield* surface(sight.spawn(input));
		}),
});
