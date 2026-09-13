import type { Api } from "@antumbra/app-testing/glass/entry.tsx";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
export const pieceId = PieceId.make("piece:reef");
export const repoId = RepoId.make("repo:reef");
const voyageId = VoyageId.make("voyage:reef");
export const changeId = "change:reef";
export const observed = {
	repoId,
	externalId: "41",
	activityAt: 1000,
	baseRef: "main",
	headRef: "work/reef",
	headSha: "sha-1",
	isDraft: false,
	checks: "red",
	review: "approved",
	mergeable: "clean",
	stage: "open",
	raw: { state: "open" },
	title: "Soundings",
	url: "https://github.com/example/reef/pull/41",
} as const;
export const ready = Effect.fnUntraced(function* (api: Api) {
	yield* api.voyages.open({
		requestId: Request.make(voyageId),
		kind: "voyage",
		name: "Reef",
		northStar: "Known shoals",
		context: "Sound the reef",
		captainBackend: null,
		captainModel: null,
		captainEffort: null,
		crewBackend: null,
		crewModel: null,
		crewEffort: null,
	});
	yield* api.pieces.charter({
		requestId: Request.make(pieceId),
		voyageId,
		title: "Soundings",
		charter: "Sound it",
		expectation: "Chart",
		role: "hand",
		dependsOn: [],
	});
	yield* api.repos.register({ requestId: Request.make(repoId), source: "https://github.com/example/reef.git", defaultRef: "main" });
	yield* api.changes.adopt({
		requestId: Request.make(changeId),
		pieceId,
		repoId,
		agentId: null,
		host: "github",
		observedAt: new Date(2000).toISOString(),
		observation: observed,
	});
});
