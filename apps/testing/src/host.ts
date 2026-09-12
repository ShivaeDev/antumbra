import { ChangeHostRefused, ChangeHosts } from "@antumbra/platform-change-host/port.ts";
import type { Capability, Observation, OpenRequest } from "@antumbra/platform-vocabulary/change-host.ts";
import { Context, Deferred, Effect, Layer, Queue } from "effect";

interface PendingOpen {
	readonly request: OpenRequest;
	readonly accept: (observation: Observation) => Effect.Effect<void>;
	readonly refuse: (detail: string) => Effect.Effect<void>;
}

export class ScriptedHost extends Context.Service<
	ScriptedHost,
	{
		readonly nextOpen: Effect.Effect<PendingOpen>;
		readonly setObservation: (observation: Observation) => Effect.Effect<void>;
		readonly setCapability: (capability: Capability) => Effect.Effect<void>;
	}
>()("@antumbra/app-testing/ScriptedHost") {}

const key = (repoId: string, externalId: string): string => JSON.stringify([repoId, externalId]);

export const layer = Layer.effectContext(
	Effect.gen(function* () {
		const pending = yield* Effect.acquireRelease(Queue.make<PendingOpen>(), Queue.shutdown);
		const observations = new Map<string, Observation>();
		let capability: Capability = { available: true, detail: "available" };
		const setObservation = (observation: Observation) =>
			Effect.sync(() => {
				observations.set(key(observation.repoId, observation.externalId), observation);
			});
		return Context.make(ScriptedHost, {
			nextOpen: Queue.take(pending),
			setObservation,
			setCapability: (value) =>
				Effect.sync(() => {
					capability = value;
				}),
		}).pipe(
			Context.add(ChangeHosts, [
				{
					tag: "scripted",
					supports: () => true,
					capability: Effect.sync(() => capability),
					open: (request) =>
						Effect.gen(function* () {
							const answer = yield* Deferred.make<Observation, ChangeHostRefused>();
							yield* Queue.offer(pending, {
								request,
								accept: (observation) => setObservation(observation).pipe(Effect.andThen(Deferred.succeed(answer, observation)), Effect.asVoid),
								refuse: (detail) => Deferred.fail(answer, new ChangeHostRefused({ host: "scripted", detail })).pipe(Effect.asVoid),
							});
							return yield* Deferred.await(answer);
						}),
					adopt: (url, repo) =>
						Effect.suspend(() => {
							const observation = [...observations.values()].find((value) => value.repoId === repo.id && value.url === url);
							return observation === undefined
								? Effect.fail(new ChangeHostRefused({ host: "scripted", detail: "no change at this URL" }))
								: Effect.succeed(observation);
						}),
					observe: (refs) =>
						Effect.sync(() =>
							refs.flatMap((ref) => {
								const observation = observations.get(key(ref.repo.id, ref.externalId));
								return observation === undefined ? [] : [observation];
							}),
						),
				},
			]),
		);
	}),
);
