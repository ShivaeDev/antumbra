import type { RulingAuthority, RulingRadius } from "@antumbra/vocabulary/ruling";
import type { RulingClimbingAuthority } from "#acts.ts";

const ANSWERS: Readonly<Record<RulingAuthority, ReadonlyArray<RulingRadius>>> = {
	admiral: ["piece", "voyage", "fleet"],
	captain: ["piece", "voyage"],
	flagship: ["piece", "voyage", "fleet"],
};

export const answersAt = (by: RulingAuthority, radius: RulingRadius): boolean => ANSWERS[by].includes(radius);

const HEIGHT: Readonly<Record<RulingAuthority, number>> = {
	admiral: 2,
	captain: 0,
	flagship: 1,
};

export const reachesRung = (by: RulingAuthority, rung: RulingAuthority): boolean => HEIGHT[by] >= HEIGHT[rung];

export const rungAbove: Readonly<Record<RulingClimbingAuthority, RulingAuthority>> = {
	captain: "flagship",
	flagship: "admiral",
};
