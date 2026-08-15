import {
	SightFailure,
	type VoyageSummary,
	type VoyageView,
} from "@antumbra/contract";
import { Effect, Option } from "effect";
import type { AgentDomain } from "#domain.ts";
import { toFailure } from "#sight-failure.ts";
import { summarySeen, voyageSeen } from "#voyage-projection.ts";

type Domain = AgentDomain["Service"];

export interface VoyageReads {
	readonly summaryOf: (
		voyageId: string,
	) => Effect.Effect<VoyageSummary, SightFailure>;
	readonly voyage: (
		voyageId: string,
	) => Effect.Effect<VoyageView, SightFailure>;
	readonly voyages: Effect.Effect<ReadonlyArray<VoyageSummary>, SightFailure>;
}

const absent = (voyageId: string) =>
	new SightFailure({ message: `no such voyage: ${voyageId}` });

const boardOf = (domain: Domain, voyageId: string) =>
	domain.boards
		.read({ kind: "voyage", voyageId })
		.pipe(Effect.mapError(toFailure));

const readVoyage = (domain: Domain, voyageId: string) =>
	domain.voyages.read(voyageId).pipe(
		Effect.mapError(toFailure),
		Effect.flatMap(
			Option.match({
				onNone: () => absent(voyageId),
				onSome: (view) =>
					boardOf(domain, voyageId).pipe(
						Effect.map((entries) => voyageSeen(view, entries)),
					),
			}),
		),
	);

const listed = (all: ReadonlyArray<VoyageSummary>, voyageId: string) => {
	const opened = all.find((row) => row.id === voyageId);
	return opened === undefined ? absent(voyageId) : Effect.succeed(opened);
};

export const makeVoyageReads = (domain: Domain): VoyageReads => {
	const voyages = domain.voyages.list.pipe(
		Effect.map((rows) => rows.map(summarySeen)),
		Effect.mapError(toFailure),
	);
	return {
		// why: a voyage the window just opened is read back rather than assembled
		// from the row that opened it — state, counts and captain are all derived,
		// and a window must never be handed a second opinion on them.
		summaryOf: (voyageId) =>
			voyages.pipe(Effect.flatMap((all) => listed(all, voyageId))),
		voyage: (voyageId) => readVoyage(domain, voyageId),
		voyages,
	};
};
