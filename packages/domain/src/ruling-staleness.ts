import type { Ruling, RulingSubject } from "@antumbra/rulings";
import { concludedPieces } from "#piece-state.ts";
import type { RetirementWorld, VoyageWorld } from "#voyage-rows.ts";

type StalenessRows = RetirementWorld & Pick<VoyageWorld, "memberships">;

interface ConcludableSubject {
	readonly id: string;
	readonly kind: "piece" | "voyage";
}

const concludable = (subject: RulingSubject): subject is ConcludableSubject => subject.kind === "piece" || subject.kind === "voyage";

const voyageConcluded = (world: StalenessRows, states: ReadonlyMap<string, "abandoned" | "done">, voyageId: string): boolean => {
	const pieces = world.memberships.filter((membership) => membership.voyageId === voyageId);
	return pieces.length > 0 && pieces.every((membership) => states.has(membership.pieceId));
};

export const rulingStaleness = (world: StalenessRows) => {
	const states = concludedPieces(world);
	const concluded = (subject: ConcludableSubject): boolean =>
		subject.kind === "piece" ? states.has(subject.id) : voyageConcluded(world, states, subject.id);
	return (ruling: Ruling): boolean => {
		const finite = ruling.subjects.filter(concludable);
		return finite.length > 0 && finite.every(concluded);
	};
};
