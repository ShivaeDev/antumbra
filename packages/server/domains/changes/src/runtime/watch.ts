import type { ChangeHost } from "@antumbra/platform-change-host/port.ts";
import { ChangeHosts } from "@antumbra/platform-change-host/port.ts";
import { make, Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { run } from "@antumbra/server-journal/reconcile.ts";
import { Clock, Effect, Ref } from "effect";
import { observeHostCapability } from "#commands/host-capability.ts";
import { failPublication } from "#commands/publication-failed.ts";
import { adoptions } from "#queries/adoptions.ts";
import { publishing } from "#queries/publishing.ts";
import { world } from "#queries/world.ts";
import { adoptExternal } from "#runtime/adopt.ts";
import { nextObserveDelayMillis, retryObserveDelayMillis } from "#runtime/cadence.ts";
import { recordObservation } from "#runtime/observations.ts";
import { publish } from "#runtime/publish.ts";
import { readWorld } from "#runtime/read.ts";

const cadence = { coldMillis: 900000, hotMillis: 30000, hotWindowMillis: 600000, warmMillis: 180000 };
const watchHost = Effect.fn("changes.watchHost")(function* (host: ChangeHost) {
	const delay = yield* Ref.make(cadence.coldMillis);
	const failures = yield* Ref.make(0);
	const observer = yield* run(world, {}, (snapshot) =>
		Effect.gen(function* () {
			const capability = yield* host.capability;
			const commit = yield* Commit;
			yield* commit
				.commit(observeHostCapability, { requestId: Request.make(make()), host: host.tag, ...capability })
				.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
			const changes = snapshot.changes.filter((row) => row.host === host.tag && row.stage === "open");
			const repos = new Map(snapshot.repos.map((row) => [row.id, row]));
			const refs = changes.flatMap((row) => {
				const repo = repos.get(row.repoId);
				return repo === undefined || row.externalId === null ? [] : [{ repo, externalId: row.externalId }];
			});
			if (refs.length > 0) yield* Effect.forEach(yield* host.observe(refs), (seen) => recordObservation(host.tag, seen), { discard: true });
			yield* Ref.set(failures, 0);
			yield* Ref.set(delay, nextObserveDelayMillis(changes, yield* Clock.currentTimeMillis, cadence));
		}).pipe(
			Effect.catch((error) =>
				Effect.gen(function* () {
					const count = yield* Ref.updateAndGet(failures, (n) => n + 1);
					yield* Ref.set(delay, retryObserveDelayMillis(count, cadence));
					yield* Effect.logWarning("change observation failed", { host: host.tag, error });
				}),
			),
		),
	);
	yield* Effect.forkScoped(
		Effect.forever(
			Effect.gen(function* () {
				yield* Effect.sleep(yield* Ref.get(delay));
				yield* observer.refresh;
			}),
		),
	);
	return observer;
});
export const watchChanges = Effect.gen(function* () {
	const hosts = yield* ChangeHosts;
	const observers = yield* Effect.forEach(hosts, watchHost);
	const publisher = yield* run(publishing, {}, (rows) =>
		Effect.forEach(
			rows,
			(row) =>
				publish(row).pipe(
					Effect.catch((error) =>
						Effect.gen(function* () {
							const commit = yield* Commit;
							yield* commit
								.commit(failPublication, {
									requestId: Request.make(make()),
									changeId: row.id,
									attemptId: row.publicationRequestId ?? "",
									message: String(error),
								})
								.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
						}),
					),
				),
			{ discard: true },
		),
	);
	const adopter = yield* run(adoptions, {}, (rows) =>
		Effect.forEach(
			rows,
			(request) =>
				Effect.gen(function* () {
					const repository = (yield* readWorld).repos.find((repo) => repo.id === request.repoId);
					if (repository !== undefined)
						yield* adoptExternal({
							adoptionId: request.id,
							callId: `${request.id}:adopt`,
							pieceId: request.pieceId,
							repo: repository.name,
							agentId: null,
							url: request.url,
						});
				}).pipe(Effect.catch((error) => Effect.logWarning("change adoption failed", { requestId: request.id, error }))),
			{ discard: true },
		),
	);
	const all = [...observers, publisher, adopter];
	yield* Effect.forkScoped(Effect.forever(Effect.sleep(cadence.warmMillis).pipe(Effect.andThen(publisher.refresh), Effect.andThen(adopter.refresh))));
	return {
		refresh: Effect.forEach(all, (observer) => observer.refresh, { discard: true }),
		await: Effect.forEach(all, (observer) => observer.await, { discard: true, concurrency: "unbounded" }),
	};
});
