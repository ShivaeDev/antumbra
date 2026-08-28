import { Schema } from "effect";
import { type AgentPrompt, agentPrompt } from "#mint.ts";
import { logSection, proseOf, section } from "#prose.ts";

export const CrewCharter = Schema.Struct({
	context: Schema.String,
	expectation: Schema.String,
	northStar: Schema.String,
	pieceCharter: Schema.String,
	pieceLog: Schema.Array(Schema.String),
	pieceTitle: Schema.String,
	// why: a standing ruling is rendered by the reader that owns the record, so
	// the catalog takes finished lines exactly as it takes piece lines.
	rulings: Schema.Array(Schema.String),
	voyageLog: Schema.Array(Schema.String),
});
export type CrewCharter = typeof CrewCharter.Type;

// why: the standing order names its tools, because a crew member that has to
// infer how to act reports into the void. Chartering is absent from the set
// and absent from the order: workers report, captains charter.
const STANDING_ORDER = [
	"- Land what you produce against your piece: `land_report` for prose another agent will read, `land_artifact` for something a person should look at. A piece is done when its outcomes land; nothing else marks it.",
	"- Code changes are opened with `open_change` against the repo you were berthed in, or adopted with `adopt_change` if you opened one by hand. Opening is not landing: your piece completes when the change lands.",
	"- Write anything your successor must know to your piece board with `write_board` — the smooth register for what stays true, the rough register for scratch. `read_board` shows what earlier hands left.",
	"- Read what binds you before you ask: the standing rulings above already decide part of this, `read_rulings` gives you every one of them in full, and `request_ruling` is how you ask for a decision nobody has made yet.",
	"- Call `stand_down` once everything is landed. Antumbra accepts the request before detaching execution and preserves your identity for later hails or work assignments.",
	"- You charter nothing. If the voyage needs more pieces, say so in your report.",
].join("\n");

// why: the charter is the only thing crew is told at birth, and it is read by
// a model, not parsed — so it stays plain prose in a fixed order: where the
// voyage is going, what surrounds it, the piece this agent answers to, what
// earlier hands left behind, what already binds it, and how to act.
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
