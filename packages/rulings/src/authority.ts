import type {
	RulingAuthority,
	RulingRadius,
} from "@antumbra/vocabulary/ruling";

// why: radius decides which authority level may answer, and the ladder is
// filled from the top down. The admiral holds a standing right over every
// rung; the flagship answers what binds the fleet and nothing narrower.
// Voyage captains join later, so until they do everything below fleet radius
// still waits for the admiral rather than being answerable by the flagship.
const ANSWERS: Readonly<Record<RulingAuthority, ReadonlyArray<RulingRadius>>> =
	{
		admiral: ["piece", "voyage", "fleet"],
		flagship: ["fleet"],
	};

export const answersAt = (by: RulingAuthority, radius: RulingRadius): boolean =>
	ANSWERS[by].includes(radius);
