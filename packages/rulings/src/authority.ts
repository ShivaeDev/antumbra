import type { RulingAuthority, RulingRadius } from "@antumbra/vocabulary/ruling";
import type { RulingClimbingAuthority } from "#acts.ts";

// why: radius decides how far an answer reaches, so it decides who may give
// one. A voyage captain answers for the work in front of it and for its own
// ship; the flagship is the fleet's own authority and is not narrowed by a
// question about one ship; the admiral holds a standing right over every rung.
const ANSWERS: Readonly<Record<RulingAuthority, ReadonlyArray<RulingRadius>>> = {
	admiral: ["piece", "voyage", "fleet"],
	captain: ["piece", "voyage"],
	flagship: ["piece", "voyage", "fleet"],
};

export const answersAt = (by: RulingAuthority, radius: RulingRadius): boolean => ANSWERS[by].includes(radius);

// why: the ladder in the order a request climbs it. A question that already
// climbed past a rung is no longer that rung's to settle, so a verdict is
// measured against the rung the ruling waits on rather than against reach
// alone — reach says what an authority may bind, the ladder says whose turn
// it still is.
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
