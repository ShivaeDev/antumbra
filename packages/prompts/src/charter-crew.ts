import { Schema } from "effect";
import { type AgentPrompt, agentPrompt } from "#mint.ts";
import { logSection, proseOf, section } from "#prose.ts";
import { STANDING_ORDERS } from "#standing-orders.ts";

const CrewCharter = Schema.Struct({
	context: Schema.String,
	expectation: Schema.String,
	northStar: Schema.String,
	pieceCharter: Schema.String,
	pieceLog: Schema.Array(Schema.String),
	pieceTitle: Schema.String,
	rulings: Schema.Array(Schema.String),
	voyageLog: Schema.Array(Schema.String),
});
export type CrewCharter = typeof CrewCharter.Type;

const STANDING_ORDER = [
	"- Work the piece you were assigned toward its expected outcome. Report what you found, what you did and what remains; write reports for agents and artifacts for the admiral. Proposed further work belongs in your report for the captain to charter.",
	"- Your piece's completion is derived from landed and pending outcomes. An open change is still pending; a quiet session or a claim of completion does not land it. Once your assigned work and its outcomes are landed, you have nothing further to do until addressed or assigned more work.",
	STANDING_ORDERS,
].join("\n");

export const crewCharter = (input: CrewCharter): AgentPrompt =>
	agentPrompt(
		proseOf([
			section("North star", input.northStar),
			section("Context", input.context),
			section(`Your piece: ${input.pieceTitle}`, input.pieceCharter),
			section("Expected outcome", input.expectation),
			logSection("Voyage log", input.voyageLog),
			logSection("Piece log", input.pieceLog),
			logSection("Standing rulings", input.rulings),
			section("Standing orders", STANDING_ORDER),
		]),
	);
