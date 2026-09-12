import { type CharterFailure, type EdgeFailure, EdgeWouldCycle, PieceIncomplete, PieceNotFound } from "@antumbra/pieces/errors";
import { VoyageNotFound } from "@antumbra/voyages/errors";
import { Effect } from "effect";

export interface Refused {
	readonly _tag: string;
	readonly field?: string;
	readonly from?: string;
	readonly message?: string;
	readonly pieceId?: string;
	readonly to?: string;
}

const NAMELESS = "";

const cycled = (failure: Refused) => new EdgeWouldCycle({ fromPieceId: failure.from ?? NAMELESS, toPieceId: failure.to ?? NAMELESS });

export const charterRefused =
	(voyageId: string) =>
	(failure: Refused): Effect.Effect<never, CharterFailure> => {
		if (failure._tag === "UnknownVoyage") {
			return Effect.fail(new VoyageNotFound({ voyageId }));
		}
		if (failure._tag === "UnknownDependency") {
			return Effect.fail(new PieceNotFound({ pieceId: failure.pieceId ?? NAMELESS }));
		}
		if (failure._tag === "WouldCycle") {
			return Effect.fail(cycled(failure));
		}
		if (failure._tag === "Blank") {
			return Effect.fail(new PieceIncomplete({ field: failure.field ?? NAMELESS, message: failure.message ?? NAMELESS }));
		}
		return Effect.die(failure);
	};

export const rewireRefused =
	(pieceId: string) =>
	(failure: Refused): Effect.Effect<never, EdgeFailure> => {
		if (failure._tag === "WouldCycle") {
			return Effect.fail(cycled(failure));
		}
		if (failure._tag === "Unknown" || failure._tag === "UnknownDependency") {
			return Effect.fail(new PieceNotFound({ pieceId: failure.pieceId ?? pieceId }));
		}
		return Effect.die(failure);
	};

export const actRefused =
	(pieceId: string) =>
	(failure: Refused): Effect.Effect<never, PieceNotFound> =>
		failure._tag === "Unknown" ? Effect.fail(new PieceNotFound({ pieceId })) : Effect.die(failure);
