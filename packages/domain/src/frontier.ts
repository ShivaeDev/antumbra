import type { Ruling } from "@antumbra/rulings";
import { Option } from "effect";
import type { VoyageWorld } from "#voyage-rows.ts";

const namesVoyage = (ruling: Ruling, voyageId: string): boolean =>
	ruling.subjects.some((subject) => subject.kind === "voyage" && subject.id === voyageId);

export const frontierOf = (world: VoyageWorld, voyageId: string): ReadonlyArray<Ruling> =>
	world.openRulings.filter((ruling) => ruling.requester.kind === "agent" && Option.isNone(ruling.parked) && namesVoyage(ruling, voyageId));
