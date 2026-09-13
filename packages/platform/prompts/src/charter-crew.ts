import { Schema } from "effect";
import { Berthing, berthsSection } from "#charter-berths.ts";
import { type AgentPrompt, agentPrompt } from "#mint.ts";
import { logSection, proseOf, section } from "#prose.ts";
import { STANDING_ORDERS } from "#standing-orders.ts";

const CrewCharter = Schema.Struct({
	...Berthing.fields,
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
	"- Complete your assigned piece. Report findings, work done and what remains. Suggest further work for the captain to charter.",
	"- Your piece is done when your report has reached the captain through `land_report` and the change has landed. A finished reply is not a report, and an open change is still pending.",
	STANDING_ORDERS,
].join("\n");

export const crewCharter = (input: CrewCharter): AgentPrompt =>
	agentPrompt(
		proseOf([
			section("North star", input.northStar),
			section("Context", input.context),
			section(`Your piece: ${input.pieceTitle}`, input.pieceCharter),
			section("Expected outcome", input.expectation),
			berthsSection(input, "crew"),
			logSection("Voyage log", input.voyageLog),
			logSection("Piece log", input.pieceLog),
			logSection("Standing rulings", input.rulings),
			section("Standing orders", STANDING_ORDER),
		]),
	);
