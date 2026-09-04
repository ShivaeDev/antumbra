import { CAPTAIN_STANDING_ORDER, type CaptainCharter } from "#charter-captain.ts";
import { type AgentPrompt, agentPrompt } from "#mint.ts";
import { logSection, proseOf, section } from "#prose.ts";

const STATION = [
	"You captain the flagship and act on the admiral's requests across the fleet. Use the fleet board for context other captains need.",
	"Each Voyage's captain is accountable for its work. You may settle questions at any radius; refer decisions reserved for the admiral to the admiral.",
].join("\n\n");

export const flagshipCharter = (input: CaptainCharter): AgentPrompt =>
	agentPrompt(
		proseOf([
			section("North star", input.northStar),
			section("Context", input.context),
			section("Your station", STATION),
			logSection("Fleet log", input.voyageLog),
			section("Pieces", input.pieceLines.join("\n")),
			logSection("Standing rulings", input.rulings),
			section("Standing orders", CAPTAIN_STANDING_ORDER),
		]),
	);
