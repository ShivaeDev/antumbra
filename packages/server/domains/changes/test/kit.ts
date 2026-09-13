import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import type { Feedback, Observation } from "@antumbra/platform-vocabulary/change-host.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Clock, Effect } from "effect";
export const request = (name: string) => Request.make(name);
export const recorded = (agoMillis: number): Effect.Effect<string> =>
	Effect.map(Clock.currentTimeMillis, (now) => new Date(now - agoMillis).toISOString());
export const voyageId = VoyageId.make("voyage:reef");
export const pieceId = PieceId.make("piece:reef");
export const repoId = RepoId.make("repo:reef");
export const opening = {
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	context: "Sound the reef",
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
	kind: "voyage",
	name: "Reef",
	northStar: "Every shoal is known",
	requestId: request(voyageId),
} as const;
export const chartering = {
	charter: "Sound the reef",
	dependsOn: [],
	expectation: "Soundings",
	requestId: request(pieceId),
	role: "hand",
	title: "Soundings",
	voyageId,
};
export const registration = { requestId: request(repoId), name: "reef", source: "https://github.com/example/reef.git", defaultRef: "main" };
const PULL = "https://github.com/example/reef/pull/41";
export const review = (id: string, body: string, at: number): Feedback => ({
	id,
	kind: "review",
	author: "octocat",
	verdict: "commented",
	path: null,
	line: null,
	body,
	url: `${PULL}#pullrequestreview-${id}`,
	at,
});
export const inline = (id: string, body: string, at: number): Feedback => ({
	id,
	kind: "inline",
	author: "octocat",
	verdict: null,
	path: "src/reef.ts",
	line: 42,
	body,
	url: `${PULL}#discussion_${id}`,
	at,
});
export const comment = (id: string, body: string, at: number): Feedback => ({
	id,
	kind: "comment",
	author: "octocat",
	verdict: null,
	path: null,
	line: null,
	body,
	url: `${PULL}#issuecomment-${id}`,
	at,
});
export const seen = (stage: Observation["stage"], activityAt = 1000, feedback: readonly Feedback[] = []): Observation => ({
	repoId,
	externalId: "41",
	activityAt,
	baseRef: "main",
	headRef: "work/reef",
	headSha: "sha-1",
	isDraft: false,
	checks: "green",
	review: "approved",
	mergeable: "clean",
	stage,
	feedback,
	raw: { state: stage },
	title: "Soundings",
	url: PULL,
});
export const adoption = {
	requestId: request("change:reef"),
	pieceId,
	repoId,
	agentId: null,
	host: "github",
	observation: seen("open"),
	observedAt: new Date(2000).toISOString(),
};
