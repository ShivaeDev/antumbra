import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { PieceId } from "@antumbra/platform-vocabulary/piece.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { VoyageId } from "@antumbra/platform-vocabulary/voyage.ts";
import { Effect, Fiber } from "effect";
import { expect } from "vitest";

const birth = Request.make("held-worker");
const { agentId } = identity(birth);
const repoId = RepoId.make("repo");
const pieceId = PieceId.make("piece");
postgresApp.it(
	"a Change holds retired resources until a concurrent landing commits",
	[],
	function* ({ journal, replayJournal, api, holdWrite, rebuild, published, clearPublished }) {
		const legacy = yield* journal();
		yield* legacy.api.voyages.open({
			requestId: Request.make("voyage"),
			name: "Reef",
			context: "Sound",
			northStar: "Safe passage",
			kind: "voyage",
			captainBackend: null,
			captainModel: null,
			captainEffort: null,
			crewBackend: null,
			crewModel: null,
			crewEffort: null,
		});
		yield* legacy.api.pieces.charter({
			requestId: Request.make(pieceId),
			voyageId: VoyageId.make("voyage"),
			title: "Sound",
			charter: "Passage",
			expectation: "Chart",
			role: "hand",
			dependsOn: [],
		});
		yield* legacy.api.repos.register({ requestId: Request.make(repoId), source: "/repo", defaultRef: "main" });
		yield* legacy.api.agents.spawn({ requestId: birth, role: "hand", backend: "claude", model: null, effort: null });
		yield* legacy.api.reclamation.plan({
			agentId,
			runner: "runner",
			plan: { root: "/moorage", berths: [{ slug: "repo", source: "/repo", ref: "main", branch: "work/reef", path: "/moorage/repo" }] },
		});
		yield* legacy.api.changes.adopt({
			requestId: Request.make("change"),
			pieceId,
			repoId,
			agentId: null,
			host: "github",
			observedAt: new Date(0).toISOString(),
			observation: {
				repoId,
				externalId: "41",
				activityAt: 0,
				baseRef: "main",
				headRef: "work/reef",
				headSha: "sha",
				isDraft: false,
				checks: "green",
				review: "approved",
				mergeable: "clean",
				stage: "open",
				feedback: [],
				raw: { state: "closed" },
				title: "Soundings",
				url: "https://github.com/example/reef/pull/41",
			},
		});
		yield* legacy.api.agents.retire({ id: agentId });
		yield* replayJournal(legacy);
		yield* clearPublished();
		expect(yield* Effect.flip(api["reclamation.claim"]({ agentId, requestId: Request.make("held-claim") }))).toMatchObject({ _tag: "Held" });
		expect(yield* published()).toEqual([]);
		const dismissal = yield* holdWrite(
			api["changes.observe"]({
				requestId: Request.make("landed"),
				host: "github",
				observedAt: new Date(1).toISOString(),
				attachment: { _tag: "Observed" },
				observation: {
					repoId,
					externalId: "41",
					activityAt: 1,
					baseRef: "main",
					headRef: "work/reef",
					headSha: "sha",
					isDraft: false,
					checks: "green",
					review: "approved",
					mergeable: "clean",
					stage: "landed",
					feedback: [],
					raw: { state: "merged" },
					title: "Soundings",
					url: "https://github.com/example/reef/pull/41",
				},
			}),
		);
		const claim = yield* api["reclamation.claim"]({ agentId, requestId: Request.make("claim") }).pipe(Effect.forkScoped);
		expect(yield* dismissal.blocked()).not.toHaveLength(0);
		expect(yield* api["reclamation.berths"]({ agentId })).toMatchObject([{ reclaimState: null }]);
		yield* dismissal.commit();
		yield* Fiber.join(claim);
		expect(yield* api["reclamation.berths"]({ agentId })).toMatchObject([{ reclaimState: "claimed" }]);
		yield* rebuild();
		expect(yield* api["reclamation.berths"]({ agentId })).toMatchObject([{ reclaimState: "claimed" }]);
	},
);
