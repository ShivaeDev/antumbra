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
	"- Land a Report with the evidence first, then open one Change for the claims the code contradicts. Work that changes what the product promises waits for a ruling and goes in a Change of its own.",
	"- A sentence in a guide that says what never happens, what is never overwritten, or what is always allowed is a product decision. Ask about it rather than soften it.",
	"- Correct a claim by saying the true thing plainly. Do not replace a sentence with a list of conditions, and do not use a word that only means something inside the code.",
	"- One ruling answers one question. What you offered in added context and nobody answered stays as it is.",
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
