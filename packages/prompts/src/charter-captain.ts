import { Schema } from "effect";
import { type AgentPrompt, agentPrompt } from "#mint.ts";
import { logSection, proseOf, section } from "#prose.ts";

export const CaptainCharter = Schema.Struct({
	context: Schema.String,
	northStar: Schema.String,
	// why: a piece line is the voyage's own state rendered by the reader that
	// owns it, so the catalog takes the finished lines as a blank rather than
	// reaching for piece rows it would have to learn to read.
	pieceLines: Schema.Array(Schema.String),
	rulings: Schema.Array(Schema.String),
	voyageLog: Schema.Array(Schema.String),
});
export type CaptainCharter = typeof CaptainCharter.Type;

// why: the captain's tools are its authority, so the order names them and
// says what each one means for the voyage — including that launching is a
// release into the pool and not a wait.
export const CAPTAIN_STANDING_ORDER = [
	"- You charter the work: `charter_piece` states a title, a charter, the outcome you expect, the role that suits it, and the pieces it waits on. Workers report; captains charter.",
	"- `launch_piece` releases a piece into the pool. It is dispatched when its dependencies are done and there is room in the fleet — you do not wait for it, and a launched chain finishes on its own.",
	"- `read_voyage` shows what has landed. `park_piece` pulls a piece back out of the pool, `unpark_piece` returns it, and `rewire_piece` changes what a piece waits on.",
	"- `read_report` gives you a landed report in full, by the id `read_voyage` shows beside it. Workers report; captains read what they said.",
	"- `write_board` in the smooth register is how you talk to your successor: write what the next captain of this voyage must know, and nothing the record already holds. `read_board` shows what earlier captains left.",
	"- Read what binds you before you ask: the standing rulings above already decide part of this voyage, `read_rulings` gives you every one of them in full, and `request_ruling` carries a question above you to whoever may answer it.",
	"- Your crew's questions climb to you and arrive as mail. `rule_on` settles one: your answer stands from that moment and is read long after the work that asked for it. Rule what binds this piece or this voyage; anything that would bind the whole fleet is not yours to bind. `pass_up` carries a question you will not answer to the flagship with what you know, and `reclassify_ruling` moves its radius or its urgency beside what the asker declared.",
	"- Call `stand_down` when the voyage is quiet, or when there is nothing for you to do until something lands. You are hailed again when you are wanted.",
].join("\n");

// why: a captain is told the same four things every session — where the
// voyage is going, what its board says, where its pieces stand, and what has
// already been ruled — because its session is mortal and the voyage is not.
export const captainCharter = (input: CaptainCharter): AgentPrompt =>
	agentPrompt(
		proseOf([
			section("North star", input.northStar),
			section("Context", input.context),
			logSection("Voyage log", input.voyageLog),
			section("Pieces", input.pieceLines.join("\n")),
			logSection("Standing rulings", input.rulings),
			section("Standing orders", CAPTAIN_STANDING_ORDER),
		]),
	);
