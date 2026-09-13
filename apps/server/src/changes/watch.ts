import { failAdoption } from "@antumbra/domain-changes/commands/adoption-failed.ts";
import { hostCapabilities, observeHostCapability } from "@antumbra/domain-changes/commands/host-capability.ts";
import { failPublication } from "@antumbra/domain-changes/commands/publication-failed.ts";
import { pendingAdoptions } from "@antumbra/domain-changes/queries/pending-adoptions.ts";
import { publishing } from "@antumbra/domain-changes/queries/publishing.ts";
import { world } from "@antumbra/domain-changes/queries/world.ts";
import type { ChangeHost } from "@antumbra/platform-change-host/port.ts";
import { ChangeHosts } from "@antumbra/platform-change-host/port.ts";
import { make, Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { each, run } from "@antumbra/server-journal/reconcile.ts";
import { Effect, Ref } from "effect";
import { adoptExternal } from "#changes/adopt.ts";
import { recordObservation } from "#changes/observations.ts";
import { publish } from "#changes/publish.ts";
import { readWorld } from "#changes/read.ts";

const OBSERVE_INTERVAL_MILLIS = 60_000;
const OBSERVE_BACKOFF_CAP_MILLIS = 900_000;

const recordCapability = Effect.fn("changes.recordCapability")(function* (host: ChangeHost) {
	const seen = yield* host.capability;
	const live = yield* Live;
	const held = (yield* live.read(hostCapabilities, {})).find((row) => row.host === host.tag);
	if (held !== undefined && held.available === seen.available && held.detail === seen.detail) return;
	const commit = yield* Commit;
	yield* commit
		.commit(observeHostCapability, { requestId: Request.make(make()), host: host.tag, ...seen })
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
});

const observePass = Effect.fn("changes.observePass")(function* (host: ChangeHost, snapshot: typeof world.output.Type) {
	if (!snapshot.repos.some((repo) => host.supports(repo))) return;
	yield* recordCapability(host);
	const repos = new Map(snapshot.repos.map((row) => [row.id, row]));
	const open = snapshot.changes.filter((row) => row.host === host.tag && row.stage === "open");
	const refs = open.flatMap((row) => {
		const repo = repos.get(row.repoId);
		return repo === undefined || row.externalId === null ? [] : [{ repo, externalId: row.externalId }];
	});
	if (refs.length === 0) return;
	yield* Effect.forEach(yield* host.observe(refs), (seen) => recordObservation(host.tag, seen), { discard: true });
});

const watchHost = Effect.fn("changes.watchHost")(function* (host: ChangeHost) {
	const wait = yield* Ref.make(OBSERVE_INTERVAL_MILLIS);
	const observer = yield* run(world, {}, (snapshot) =>
		observePass(host, snapshot).pipe(
			Effect.andThen(Ref.set(wait, OBSERVE_INTERVAL_MILLIS)),
			Effect.catch((error) =>
				Effect.andThen(
					Ref.update(wait, (held) => Math.min(held * 2, OBSERVE_BACKOFF_CAP_MILLIS)),
					Effect.logWarning("change observation failed", { host: host.tag, error }),
				),
			),
		),
	);
	yield* Effect.forkScoped(Effect.forever(Effect.andThen(Effect.flatMap(Ref.get(wait), Effect.sleep), observer.refresh)));
	return observer;
});
const recordPublicationFailure = Effect.fn("changes.recordPublicationFailure")(function* (row: Parameters<typeof publish>[0], error: unknown) {
	const commit = yield* Commit;
	yield* commit
		.commit(failPublication, {
			requestId: Request.make(make()),
			changeId: row.id,
			attemptId: row.publicationRequestId ?? "",
			message: String(error),
		})
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
});
export const watchChanges = Effect.gen(function* () {
	const hosts = yield* ChangeHosts;
	const observers = yield* Effect.forEach(hosts, watchHost);
	const publisher = yield* each(
		publishing,
		{},
		(row) => row.id,
		(row) =>
			publish(row).pipe(
				Effect.asVoid,
				Effect.catch((error) => recordPublicationFailure(row, error)),
			),
	);
	const adopter = yield* each(
		pendingAdoptions,
		{},
		(request) => request.id,
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
			}).pipe(
				Effect.catch((error) =>
					Effect.gen(function* () {
						const commit = yield* Commit;
						yield* commit
							.commit(failAdoption, { requestId: Request.make(make()), id: request.id, url: request.url, message: String(error) })
							.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
					}),
				),
			),
	);
	const all = [...observers, publisher, adopter];
	return {
		refresh: Effect.forEach(all, (observer) => observer.refresh, { discard: true }),
		await: Effect.forEach(all, (observer) => observer.await, { discard: true, concurrency: "unbounded" }),
	};
});
