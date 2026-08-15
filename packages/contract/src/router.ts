import {
	type EffectTRPCRuntime,
	internalServerError,
	makeEffectTRPC,
	makeRequestServices,
} from "@shivaedev/effect-trpc";
import { initTRPC } from "@trpc/server";
import { Context, Effect, Layer, Schema } from "effect";
import { AppInfo, AppInfoSource } from "#app-info.ts";
import {
	EventQuery,
	Fleet,
	RepoRegistration,
	RepoSummary,
	SessionEvent,
	type SightFailure,
	SightSource,
	SpawnReceipt,
	SpawnRequest,
} from "#sight.ts";

export interface RequestContext {
	readonly senderId: number;
}

export class RequestOrigin extends Context.Service<
	RequestOrigin,
	RequestContext
>()("@antumbra/contract/RequestOrigin") {}

const t = initTRPC.context<RequestContext>().create();

const requestServices = makeRequestServices((context: RequestContext) =>
	Layer.succeed(RequestOrigin, context),
);

const surface = <A, R>(effect: Effect.Effect<A, SightFailure, R>) =>
	effect.pipe(
		Effect.catchTag("SightFailure", (failure) =>
			internalServerError(failure.message),
		),
	);

export const makeAppRouter = (
	runtime: EffectTRPCRuntime<AppInfoSource | SightSource, never>,
) => {
	const adapter = makeEffectTRPC({ runtime });
	const procedure = adapter.procedure(t.procedure, requestServices);
	return t.router({
		appInfo: procedure.output(AppInfo).query(function* () {
			const source = yield* AppInfoSource;
			return yield* source.current;
		}),
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
};

export type AppRouter = ReturnType<typeof makeAppRouter>;
