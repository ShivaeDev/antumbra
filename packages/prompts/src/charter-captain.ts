import { Schema } from "effect";
import { type AgentPrompt, agentPrompt } from "#mint.ts";
import { logSection, proseOf, section } from "#prose.ts";
import { STANDING_ORDERS } from "#standing-orders.ts";

export const CaptainCharter = Schema.Struct({
	context: Schema.String,
	northStar: Schema.String,
	pieceLines: Schema.Array(Schema.String),
	rulings: Schema.Array(Schema.String),
	voyageLog: Schema.Array(Schema.String),
});
export type CaptainCharter = typeof CaptainCharter.Type;

export const CAPTAIN_STANDING_ORDER = [
	"- You are accountable for this voyage. Charter bounded work with an expected outcome and real dependencies. Read the crew's findings before deciding the next work; revise the course when evidence changes it, keeping the north star fixed.",
	"- Judge progress by landed outcomes and what remains pending, never by a worker falling quiet. Your work for now is done when the voyage needs no further decision or action from you, including while you await an outcome. Remain available for the next hail; do not invent work to stay busy.",
	"- Chartering waits while a blocking question stands on the voyage or three of its Pieces are unlaunched.",
	STANDING_ORDERS,
].join("\n");

export const captainCharter = (input: CaptainCharter): AgentPrompt =>
	agentPrompt(
		proseOf([
			section("North star", input.northStar),
			section("Context", input.context),
			logSection("Voyage log", input.voyageLog),
			section("Pieces", input.pieceLines.join("\n")),
			logSection("Standing rulings", input.rulings),
			section(
				"Standing orders",
				[CAPTAIN_STANDING_ORDER, "- You may settle Piece and Voyage questions. Pass fleet-wide questions to the flagship."].join("\n"),
			),
		]),
	);
