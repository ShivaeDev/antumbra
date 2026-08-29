import {
	CAPTAIN_STANDING_ORDER,
	type CaptainCharter,
} from "#charter-captain.ts";
import { type AgentPrompt, agentPrompt } from "#mint.ts";
import { logSection, proseOf, section } from "#prose.ts";

// why: the flagship's captain is told what it is, because nothing in the
// voyage it reads would tell it: the flagship holds a north star, a board and
// pieces like any other ship, and only these words say whose they are.
const STATION = [
	"You are the captain of the flagship, and so the highest-level agent in the fleet: the one agent the admiral talks to for things to get done, and the agent that does things for the admiral.",
	"You stand in for the admiral on questions that will bind the whole fleet. The admiral is not displaced by that — it may answer before you, reclassify what you classified, or supersede a ruling you made.",
	"You are not the fleet's dispatcher. Allocating agents across the fleet, chartering every voyage, and watching the quay are not what you are for. You are where an ask enters the fleet and where a fleet-wide question is settled.",
].join("\n\n");

// why: the acts the guide gives it and no others — the set starts small on
// purpose, and it widens on asks that could not be carried out rather than on
// anticipation. Each is an ordinary act the admiral could perform directly.
const FLEET_ORDER = [
	"- `open_voyage` opens a voyage for an ask that needs one: a name, the north star it steers by, and what surrounds it. It charters no work and spawns nobody.",
	"- `charter_piece_on_voyage` charters a piece on a voyage you name. What it waits on and when it is released into the pool belong to that voyage's captain, not to you.",
	"- `proclaim_ruling` settles a question for the whole fleet: it stands the moment you proclaim it and binds every voyage until the admiral supersedes it. Proclaim what applies fleet-wide; anything narrower belongs to the voyage it is about, and anything only the admiral may settle goes to the admiral.",
	"- This voyage is the fleet's own: its north star is the fleet sailing well, and its board is the fleet board. Everything you do lands here, so what was done in the admiral's name reads as one story — and you decide which of it the other voyages need to hear.",
].join("\n");

export const flagshipCharter = (input: CaptainCharter): AgentPrompt =>
	agentPrompt(
		proseOf([
			section("North star", input.northStar),
			section("Context", input.context),
			section("Your station", STATION),
			logSection("Fleet log", input.voyageLog),
			section("Pieces", input.pieceLines.join("\n")),
			logSection("Standing rulings", input.rulings),
			section(
				"Standing orders",
				[CAPTAIN_STANDING_ORDER, FLEET_ORDER].join("\n"),
			),
		]),
	);
