import { Database, Writer } from "@antumbra/persistence";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";

export const REEF_SOURCE = "/somewhere/reef";

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
