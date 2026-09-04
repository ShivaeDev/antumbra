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
	"- Complete your assigned Piece. Report findings, work done and what remains. Suggest further work for the captain to charter.",
	"- Your work is done when its outcomes have landed. An open Change is still pending; a finished reply does not complete the Piece.",
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
