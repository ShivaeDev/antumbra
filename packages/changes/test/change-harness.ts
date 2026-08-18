import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { temporaryPersistence } from "@antumbra/persistence/testing";
import { PiecesLive } from "@antumbra/pieces";
import type {
	ChangeHost,
	ChangeObservation,
	ChangeRef,
	OpenChangeRequest,
	Runner,
} from "@antumbra/plugin-api";
import { Effect, Layer, Ref } from "effect";
import { ChangesLive } from "#index.ts";

export const CREW = "agent-crew";
export const HEAD = `work/${CREW}/berth-0`;
export const REEF_SOURCE = "/somewhere/reef";

export const acquireTemporaryPersistence = Effect.acquireRelease(
	Effect.sync(temporaryPersistence),
	(temporary) => Effect.sync(temporary.remove),
);

export const passiveRunner: Runner = {
	captureChange: (berth) =>
		Effect.succeed({
			branch: berth.branch,
			headSha: `sha-${berth.branch}`,
			workingDiff: "",
			workingTreeStatus: "",
			worktreePath: berth.path,
		}),
	capabilities: { liveTerminal: false },
	plan: (request) => ({ berths: [], root: `/tmp/moorage/${request.agentId}` }),
	provision: () => Effect.void,
	reclaim: () => Effect.succeed({ _tag: "reclaimed" }),
	scrap: () => Effect.void,
	tag: "local",
};

export const changesLayer = (
	hosts: ReadonlyArray<ChangeHost>,
	runner: Runner = passiveRunner,
) =>
	ChangesLive(
		new Map(hosts.map((host) => [host.tag, host] as const)),
		new Map([[runner.tag, runner]]),
	).pipe(Layer.provideMerge(PiecesLive), Layer.provideMerge(DomainFeedsLive));

export const createRepo = (
	id: string,
	name: string,
	source: string,
	defaultRef = "main",
) =>
	Effect.flatMap(Database, (db) =>
		db.Repo.create({ defaultRef, id, name, source }),
	);

export const createPiece = (id: string) =>
	Effect.flatMap(Database, (db) =>
		db.Piece.create({
			charter: `chart ${id}`,
			expectation: `${id} lands`,
			id,
			launchedAt: new Date("2026-08-18T00:00:00.000Z"),
			parkedAt: null,
			role: "crew",
			title: id,
		}),
	);

export const createBerth = (
	agentId: string,
	source = REEF_SOURCE,
	branch = `work/${agentId}/berth-0`,
) =>
	Effect.flatMap(Database, (db) =>
		db.Berth.create({
			agentId,
			branch,
			id: `${agentId}:berth-0`,
			path: `/tmp/moorage/${agentId}/berth-0`,
			reclaimState: null,
			ref: "main",
			runner: "local",
			slug: "berth-0",
			source,
			status: "ready",
			strandedAt: null,
		}),
	);

interface ObservationFields {
	readonly baseRef: string;
	readonly headRef: string;
	readonly repoId: string;
	readonly title: string;
}

export const observation = (
	externalId: string,
	fields: ObservationFields,
	patch: Partial<ChangeObservation> = {},
): ChangeObservation => ({
	activityAt: 1_780_000_000_000,
	baseRef: fields.baseRef,
	checks: "pending",
	externalId,
	headRef: fields.headRef,
	headSha: `sha-${fields.headRef}`,
	isDraft: false,
	mergeable: "unknown",
	raw: { number: externalId, source: "scripted" },
	repoId: fields.repoId,
	review: "none",
	stage: "open",
	title: fields.title,
	url: `https://scripted.test/changes/${externalId}`,
	...patch,
});

export interface ScriptedHost {
	readonly announce: (seen: ChangeObservation) => Effect.Effect<void>;
	readonly attempted: Effect.Effect<ReadonlyArray<OpenChangeRequest>>;
	readonly host: ChangeHost;
	readonly opened: Effect.Effect<ReadonlyArray<OpenChangeRequest>>;
	readonly transition: (
		repoId: string,
		externalId: string,
		patch: Partial<ChangeObservation>,
	) => Effect.Effect<void>;
}

const keyOf = (repoId: string, externalId: string) => `${repoId}:${externalId}`;

const adoptObservation = (
	known: Ref.Ref<ReadonlyMap<string, ChangeObservation>>,
	remember: (seen: ChangeObservation) => Effect.Effect<ChangeObservation>,
	url: string,
	repo: { readonly defaultRef: string; readonly id: string },
) =>
	Effect.gen(function* () {
		const externalId = url.split("/").at(-1) ?? "";
		const seen = (yield* Ref.get(known)).get(keyOf(repo.id, externalId));
		if (seen !== undefined) return seen;
		return yield* remember(
			observation(externalId, {
				baseRef: repo.defaultRef,
				headRef: `work/adopted-${externalId}`,
				repoId: repo.id,
				title: `adopted ${externalId}`,
			}),
		);
	});

export const makeScriptedHost = Effect.gen(function* () {
	const attempted = yield* Ref.make<ReadonlyArray<OpenChangeRequest>>([]);
	const count = yield* Ref.make(0);
	const known = yield* Ref.make<ReadonlyMap<string, ChangeObservation>>(
		new Map(),
	);
	const opened = yield* Ref.make<ReadonlyArray<OpenChangeRequest>>([]);
	const submissions = yield* Ref.make<ReadonlyMap<string, string>>(new Map());
	const remember = (seen: ChangeObservation) =>
		Ref.update(known, (all) =>
			new Map(all).set(keyOf(seen.repoId, seen.externalId), seen),
		).pipe(Effect.as(seen));
	const host: ChangeHost = {
		adopt: (url, repo) => adoptObservation(known, remember, url, repo),
		capability: Effect.succeed({ available: true, detail: "scripted" }),
		observe: (_refs: ReadonlyArray<ChangeRef>) =>
			Ref.get(known).pipe(Effect.map((all) => [...all.values()])),
		open: (request) =>
			Effect.gen(function* () {
				yield* Ref.update(attempted, (all) => [...all, request]);
				const submission = `${request.repo.id}:${request.submissionId}`;
				const previous = (yield* Ref.get(submissions)).get(submission);
				if (previous !== undefined) {
					const seen = (yield* Ref.get(known)).get(previous);
					if (seen !== undefined) return seen;
				}
				yield* Ref.update(opened, (all) => [...all, request]);
				const externalId = String(yield* Ref.updateAndGet(count, (n) => n + 1));
				const seen = yield* remember(
					observation(
						externalId,
						{
							baseRef: request.base ?? request.repo.defaultRef,
							headRef: request.berth.branch,
							repoId: request.repo.id,
							title: request.title,
						},
						{ headSha: request.headSha, isDraft: request.draft },
					),
				);
				yield* Ref.update(submissions, (all) =>
					new Map(all).set(submission, keyOf(seen.repoId, seen.externalId)),
				);
				return seen;
			}),
		supports: () => true,
		tag: "scripted",
	};
	return {
		announce: (seen) => Effect.asVoid(remember(seen)),
		attempted: Ref.get(attempted),
		host,
		opened: Ref.get(opened),
		transition: (repoId, externalId, patch) =>
			Ref.update(known, (all) => {
				const key = keyOf(repoId, externalId);
				const seen = all.get(key);
				return seen === undefined
					? all
					: new Map(all).set(key, {
							...seen,
							activityAt: seen.activityAt + 1,
							...patch,
						});
			}),
	} satisfies ScriptedHost;
});
