import { Database, Writer } from "@antumbra/persistence";
import type { ChangeStage } from "@antumbra/plugin-api";
import { Effect } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import { AgentDomain } from "#domain.ts";

export const REEF_SOURCE = "/somewhere/reef";

const OBSERVED = new Date("2026-08-15T09:00:00.000Z");

export interface ChangeFields {
	readonly headRef: string;
	readonly id: string;
	readonly repoId: string;
	readonly stage: ChangeStage;
}

// why: every column but the four a caller names is scenery here, so a test says
// only what it asserts on and the row still reads back as a whole change.
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

// why: a berth is written by a spawn in life, and these tests are about what a
// change does once an agent already has one — so the berth is a fixture here
// rather than a spawn nobody is asserting on.
export const berthed = (agentId: string, source = REEF_SOURCE) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			db.Berth.create({
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
			}),
		);
	});

export const reefWithPiece = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const repo = yield* domain.repos.register({
		defaultRef: "main",
		source: REEF_SOURCE,
	});
	const voyage = yield* domain.voyages.open({
		backend: "scripted",
		context: "the reef is uncharted",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	const piece = yield* domain.voyages.charterPiece({
		charter: "sound the shallows",
		dependsOn: [],
		expectation: "soundings are landed",
		role: "hand",
		title: "alpha",
		voyageId: voyage.id,
	});
	yield* domain.voyages.launch(piece.id);
	return { piece, repo, voyage };
});
