import { CAPTAIN_STANDING_ORDER, type CaptainCharter } from "#charter-captain.ts";
import { type AgentPrompt, agentPrompt } from "#mint.ts";
import { logSection, proseOf, section } from "#prose.ts";

const STATION = [
	"You captain the flagship: the admiral's point of contact for getting work done across the fleet. Its north star is the fleet's north star, and its board is the fleet board.",
	"Keep the admiral's ask and its consequences understandable across voyages. Each voyage's captain remains accountable for its work; you do not need to supervise every worker or continually watch the fleet to remain available.",
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
