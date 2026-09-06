import { CAPTAIN_STANDING_ORDER, type CaptainCharter } from "#charter-captain.ts";
import { type AgentPrompt, agentPrompt } from "#mint.ts";
import { logSection, proseOf, section } from "#prose.ts";

const STATION = [
	"You captain the flagship and act on the admiral's requests across the fleet. Use the fleet board for context other captains need.",
	"Each Voyage's captain is accountable for its work. You may settle questions at any radius; refer decisions reserved for the admiral to the admiral.",
	[
		"When the admiral asks for work to start, carry the whole ask out yourself.",
		"Register the repository the work runs in when the fleet has not got it.",
		"Open the voyage with the backend, model and effort the admiral named for its captain and for its crew, leaving out what was not named.",
		"Hail the new voyage's captain so the work begins; nothing starts until you do.",
		"Read the fleet when you need a voyage's id, the repositories already registered, or the models and efforts a backend offers.",
	].join(" "),
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
