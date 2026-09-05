import type { ChangeHost, ChangeObservation, OpenChangeRequest, Runner } from "@antumbra/plugin-api";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { Changes } from "#index.ts";

const runner: Runner = {
	captureChange: (berth) =>
		Effect.succeed({
			branch: berth.branch,
			headSha: `sha-${berth.branch}`,
			workingDiff: "",
			workingTreeStatus: "",
			worktreePath: berth.path,
		}),
	plan: () => ({ berths: [], root: "/tmp/moorage/crew" }),
	provision: () => Effect.void,
	reclaim: () => Effect.succeed({ _tag: "reclaimed" }),
	scrap: () => Effect.void,
	tag: "local",
};

const observation = (request: OpenChangeRequest): ChangeObservation => ({
	activityAt: 1_780_000_000_000,
	baseRef: request.base ?? request.repo.defaultRef,
	checks: "pending",
	externalId: "41",
	headRef: request.berth.branch,
	headSha: request.headSha,
	isDraft: request.draft,
	mergeable: "unknown",
	raw: { number: 41 },
	repoId: request.repo.id,
	review: "none",
	stage: "open",
	title: request.title,
	url: "https://scripted.test/changes/41",
});

const makeHost = Effect.gen(function* () {
	const openings = yield* Ref.make<ReadonlyArray<OpenChangeRequest>>([]);
	const host: ChangeHost = {
		adopt: (_url, repo) =>
			Effect.succeed(
				observation({
					base: null,
					berth: { branch: "work/adopted", path: "/tmp/adopted" },
					body: "",
					draft: false,
					headSha: "sha-adopted",
					repo,
					submissionId: "adopted",
					title: "adopted",
				}),
			),
		capability: Effect.succeed({ available: true, detail: "scripted" }),
		observe: () => Effect.succeed([]),
		open: (request) => Ref.update(openings, (all) => [...all, request]).pipe(Effect.as(observation(request))),
		supports: () => true,
		tag: "scripted",
	};
	return { host, openings: Ref.get(openings) };
});

it.effectApp.withProviders(
	"owns preparation and host reconciliation as one aggregate",
	makeHost.pipe(
		Effect.map((scripted) => ({
			providers: { changeHosts: new Map([[scripted.host.tag, scripted.host]]), runners: new Map([[runner.tag, runner]]) },
			state: scripted,
		})),
	),
	function* ({ db }, scripted) {
		const changes = yield* Changes;
		yield* Effect.all([
			db.Agent.create({
				charter: "chart the reef",
				id: "crew",
				role: "crew",
				status: "alive",
			}),
			db.Piece.create({
				charter: "sound the reef",
				expectation: "the change lands",
				id: "piece-reef",
				launchedAt: new Date(1_780_000_000_000),
				parkedAt: null,
				role: "crew",
				title: "Reef",
			}),
			db.Repo.create({
				defaultRef: "main",
				id: "repo-reef",
				name: "reef",
				source: "/somewhere/reef",
			}),
			db.Berth.create({
				agentId: "crew",
				branch: "work/crew/reef",
				id: "berth-reef",
				path: "/tmp/moorage/crew/reef",
				reclaimState: null,
				ref: "main",
				runner: "local",
				slug: "reef",
				source: "/somewhere/reef",
				status: "ready",
				strandedAt: null,
			}),
		]);

		const prepared = yield* changes.submit({
			agentId: "crew",
			pieceId: "piece-reef",
			repoName: "reef",
			sessionId: "session-crew",
		});
		expect(prepared.stage).toBe("prepared");
		expect(yield* db.PieceChange.where({ changeId: prepared.id }).all()).toEqual([
			{ changeId: prepared.id, pieceId: "piece-reef", purpose: "produces" },
		]);

		const opened = yield* changes.open({
			agentId: "crew",
			base: null,
			body: "Map the reef",
			draft: false,
			pieceId: "piece-reef",
			repoName: "reef",
			sessionId: "session-crew",
			title: "Chart the reef",
		});
		expect(opened).toMatchObject({
			externalId: "41",
			id: prepared.id,
			stage: "open",
			url: "https://scripted.test/changes/41",
		});
		expect(yield* scripted.openings).toHaveLength(1);
		expect(yield* changes.snapshot()).toEqual({
			changes: [opened],
			dismissedChangeIds: new Set(),
			pieceChanges: [
				{
					changeId: opened.id,
					pieceId: "piece-reef",
					purpose: "produces",
				},
			],
		});
	},
);

it.effectApp.withProviders(
	"reads current host availability when capabilities are requested",
	Effect.gen(function* () {
		const scripted = yield* makeHost;
		const capability = yield* Ref.make({ available: false, detail: "signed out" });
		const host = { ...scripted.host, capability: Ref.get(capability) };
		return { providers: { changeHosts: new Map([[host.tag, host]]), runners: new Map([[runner.tag, runner]]) }, state: capability };
	}),
	function* (_, capability) {
		const changes = yield* Changes;
		expect(yield* changes.hostTags()).toEqual(["scripted"]);
		expect(yield* changes.hostCapabilities()).toEqual([{ available: false, detail: "signed out", tag: "scripted" }]);
		yield* Ref.set(capability, { available: true, detail: "ready" });
		expect(yield* changes.hostCapabilities()).toEqual([{ available: true, detail: "ready", tag: "scripted" }]);
	},
);
