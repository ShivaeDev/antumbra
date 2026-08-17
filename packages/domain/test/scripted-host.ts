import type {
	ChangeHost,
	ChangeHostRepo,
	ChangeObservation,
	ChangeRef,
	OpenChangeRequest,
} from "@antumbra/plugin-api";
import { ChangeHostRefused, ChangeHostUnavailable } from "@antumbra/plugin-api";
import { Effect, Ref } from "effect";

export interface ScriptedHostDrive {
	readonly announce: (observation: ChangeObservation) => Effect.Effect<void>;
	readonly asked: Effect.Effect<ReadonlyArray<ChangeRef>>;
	readonly opened: Effect.Effect<ReadonlyArray<OpenChangeRequest>>;
	// why: a host that stops answering is the case a watcher must survive, so
	// the scripted one can be told to refuse and told to stop refusing.
	readonly refuse: (detail: string | null) => Effect.Effect<void>;
	readonly transition: (
		repoId: string,
		externalId: string,
		patch: Partial<ChangeObservation>,
	) => Effect.Effect<void>;
}

export interface ScriptedHost {
	readonly drive: ScriptedHostDrive;
	readonly host: ChangeHost;
}

export interface ScriptedHostOptions {
	readonly supports?: (repo: ChangeHostRepo) => boolean;
	readonly tag?: string;
}

interface ObservationFields {
	readonly baseRef: string;
	readonly headRef: string;
	readonly repoId: string;
	readonly title: string;
}

export const scriptedObservation = (
	tag: string,
	externalId: string,
	fields: ObservationFields,
): ChangeObservation => ({
	activityAt: 1_780_000_000_000,
	baseRef: fields.baseRef,
	checks: "pending",
	externalId,
	headRef: fields.headRef,
	headSha: `sha-${externalId}`,
	isDraft: false,
	mergeable: "unknown",
	raw: { number: externalId, source: tag },
	repoId: fields.repoId,
	review: "none",
	stage: "open",
	title: fields.title,
	url: `https://${tag}.test/changes/${externalId}`,
});

// why: a url is all a host is given to adopt by, so the scripted one reads its
// own id off the end of it — the same trick a real host plays with a number.
const adoptedObservation = (
	tag: string,
	url: string,
	repo: ChangeHostRepo,
): ChangeObservation => {
	const externalId = url.split("/").at(-1) ?? "";
	return scriptedObservation(tag, externalId, {
		baseRef: repo.defaultRef,
		headRef: `work/adopted-${externalId}`,
		repoId: repo.id,
		title: `adopted ${externalId}`,
	});
};

const observationKey = (repoId: string, externalId: string): string =>
	`${repoId}:${externalId}`;

const transitioned = (
	seen: ChangeObservation,
	patch: Partial<ChangeObservation>,
): ChangeObservation => ({
	...seen,
	activityAt: seen.activityAt + 1,
	...patch,
});

// why: the host every change test runs against — it mints ids the way a real
// one does and answers from a map the test drives, so a change's whole life is
// exercised without a network or a model. `observe` volunteers everything it
// knows rather than only what was asked, because that is the case the domain
// must survive: what it has no row for is ignored, never adopted by drift.
export const makeScriptedHost = (options: ScriptedHostOptions = {}) =>
	Effect.gen(function* () {
		const tag = options.tag ?? "scripted";
		const supports = options.supports ?? (() => true);
		const count = yield* Ref.make(0);
		const known = yield* Ref.make<ReadonlyMap<string, ChangeObservation>>(
			new Map(),
		);
		const requests = yield* Ref.make<ReadonlyArray<OpenChangeRequest>>([]);
		const refs = yield* Ref.make<ReadonlyArray<ChangeRef>>([]);
		const refusal = yield* Ref.make<string | null>(null);
		const remember = (observation: ChangeObservation) =>
			Ref.update(known, (map) =>
				new Map(map).set(
					observationKey(observation.repoId, observation.externalId),
					observation,
				),
			).pipe(Effect.as(observation));
		const host: ChangeHost = {
			adopt: (url, repo) =>
				Effect.gen(function* () {
					const fresh = adoptedObservation(tag, url, repo);
					const seen = (yield* Ref.get(known)).get(
						observationKey(repo.id, fresh.externalId),
					);
					return seen ?? (yield* remember(fresh));
				}),
			capability: Effect.succeed({ available: true, detail: "scripted" }),
			observe: (asked) =>
				Ref.update(refs, (all) => [...all, ...asked]).pipe(
					Effect.andThen(Ref.get(refusal)),
					Effect.flatMap((detail) =>
						detail === null
							? Ref.get(known).pipe(Effect.map((map) => [...map.values()]))
							: new ChangeHostUnavailable({ detail, host: tag }),
					),
				),
			open: (request) =>
				Effect.gen(function* () {
					const existing = [...(yield* Ref.get(known)).values()].find(
						(observation) =>
							observation.repoId === request.repo.id &&
							observation.headRef === request.berth.branch,
					);
					if (existing !== undefined) {
						return existing;
					}
					yield* Ref.update(requests, (all) => [...all, request]);
					const minted = yield* Ref.updateAndGet(count, (seen) => seen + 1);
					return yield* remember({
						...scriptedObservation(tag, `${minted}`, {
							baseRef: request.base ?? request.repo.defaultRef,
							headRef: request.berth.branch,
							repoId: request.repo.id,
							title: request.title,
						}),
						headSha: request.headSha,
					});
				}),
			supports,
			tag,
		};
		return {
			drive: {
				announce: (observation) => Effect.asVoid(remember(observation)),
				asked: Ref.get(refs),
				opened: Ref.get(requests),
				refuse: (detail) => Ref.set(refusal, detail),
				transition: (repoId, externalId, patch) =>
					Ref.update(known, (map) => {
						const key = observationKey(repoId, externalId);
						const seen = map.get(key);
						return seen === undefined
							? map
							: new Map(map).set(key, transitioned(seen, patch));
					}),
			},
			host,
		} satisfies ScriptedHost;
	});

// why: a build where a host is registered but claims nothing is the honest
// shape of "no host for this repo" — the refusal must name the repo rather
// than pretend a change was opened.
export const claimsNothingHost = (tag: string): ChangeHost => ({
	adopt: () => new ChangeHostRefused({ detail: "claims nothing", host: tag }),
	capability: Effect.succeed({ available: false, detail: "claims nothing" }),
	observe: () => Effect.succeed([]),
	open: () => new ChangeHostRefused({ detail: "claims nothing", host: tag }),
	supports: () => false,
	tag,
});
