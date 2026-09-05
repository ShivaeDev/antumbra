import type { ChangeRow } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import type { ChangeStage } from "@antumbra/plugin-api";
import { Repos } from "@antumbra/repos";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";

export const REEF_SOURCE = "/somewhere/reef";

const OBSERVED = new Date("2026-08-15T09:00:00.000Z");

interface ChangeFields {
	readonly headRef: string;
	readonly id: string;
	readonly repoId: string;
	readonly stage: ChangeStage;
}

export const changeOf = (fields: ChangeFields): ChangeRow => ({
	activityAt: OBSERVED,
	baseRef: "main",
	body: "",
	checks: "none",
	draftAt: null,
	externalId: fields.id,
	headRef: fields.headRef,
	headSha: null,
	host: "scripted",
	id: fields.id,
	landedAt: fields.stage === "landed" ? OBSERVED : null,
	mergeable: "clean",
	observedAt: OBSERVED,
	openedByAgentId: null,
	originSessionId: null,
	preparedHeadRef: null,
	preparedHeadSha: null,
	proposalFrozenAt: null,
	raw: null,
	repoId: fields.repoId,
	review: "none",
	stage: fields.stage,
	submissionKey: null,
	title: fields.id,
	url: null,
	withdrawnAt: fields.stage === "withdrawn" ? OBSERVED : null,
	workingDiff: null,
	workingTreeStatus: null,
	worktreePath: null,
});

export const berthed = (agentId: string, source = REEF_SOURCE) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Agent.create({
			charter: `chart ${source}`,
			id: agentId,
			role: "crew",
			status: "alive",
		});
		yield* db.Berth.create({
			agentId,
			branch: `work/${agentId}/berth-0`,
			id: `${agentId}:berth-0`,
			path: `/tmp/moorage/${agentId}/berth-0`,
			reclaimState: null,
			ref: "main",
			runner: "local",
			slug: "berth-0",
			source,
			status: "ready",
			strandedAt: null,
		});
	});

export const reefWithPiece = Effect.gen(function* () {
	const pieces = yield* Pieces;
	const domain = yield* AgentDomain;
	const repos = yield* Repos;
	const repo = yield* repos.register({
		defaultRef: "main",
		source: REEF_SOURCE,
	});
	const voyage = yield* domain.voyages.open({
		backend: "scripted",
		context: "the reef is uncharted",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	const piece = yield* pieces.charter({
		charter: "sound the shallows",
		dependsOn: [],
		expectation: "soundings are landed",
		role: "hand",
		title: "alpha",
		voyageId: voyage.id,
	});
	yield* pieces.launch(piece.id);
	return { piece, repo, voyage };
});
