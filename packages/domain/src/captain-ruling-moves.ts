import { bind, passUpSpec, reclassifyRulingSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { type Ruling, type RulingClimbingAuthority, type RulingReclassifyInput, Rulings } from "@antumbra/rulings";
import { Effect } from "effect";
import { makeRulingSpeaker } from "#ruling-speaker.ts";
import { answered, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

type Moved = (typeof reclassifyRulingSpec)["input"]["Type"];
type Pushed = (typeof passUpSpec)["input"]["Type"];

const reclassificationOf = (by: RulingClimbingAuthority, identity: SessionIdentity, input: Moved): RulingReclassifyInput => ({
	by,
	byAgentId: identity.agentId,
	rulingId: input.rulingId,
	...(input.note === undefined ? {} : { note: input.note }),
	...(input.radius === undefined ? {} : { radius: input.radius }),
	...(input.urgency === undefined ? {} : { urgency: input.urgency }),
});

const climbed = (ruling: Ruling): string =>
	`ruling ${ruling.id} passed up — it waits on the rung above you now, with your note beside the asker's own words`;

const moved = (ruling: Ruling): string =>
	`ruling ${ruling.id} now reads ${ruling.radius} radius, ${ruling.urgency} — your word is appended beside what the asker declared`;

export const makeCaptainRulingMoveToolCompiler = Effect.gen(function* () {
	const rulings = yield* Rulings;
	const speaksAs = yield* makeRulingSpeaker;
	const climbing = (identity: SessionIdentity) =>
		Effect.map(speaksAs(identity), (by): RulingClimbingAuthority => (by === "flagship" ? "flagship" : "captain"));

	const push = (identity: SessionIdentity, input: Pushed) =>
		Effect.gen(function* () {
			const by = yield* climbing(identity);
			if (input.note.trim() === "") {
				return refused(`${passUpSpec.name}: a question climbs with what you know, so say what you know`);
			}
			const given = {
				by,
				byAgentId: identity.agentId,
				note: input.note,
				rulingId: input.rulingId,
			};
			return yield* answered(identity, passUpSpec.name, rulings.passUp(given), climbed);
		});

	const move = (identity: SessionIdentity, input: Moved) =>
		Effect.gen(function* () {
			const by = yield* climbing(identity);
			return yield* answered(identity, reclassifyRulingSpec.name, rulings.reclassify(reclassificationOf(by, identity, input)), moved);
		});

	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(passUpSpec, (input: Pushed) => push(identity, input)),
		bind(reclassifyRulingSpec, (input: Moved) => move(identity, input)),
	];
});
