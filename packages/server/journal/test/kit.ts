import { pieces } from "#example/feature.ts";
import { PieceId, type PieceId as PieceIdentity, VoyageId, type VoyageId as VoyageIdentity } from "#example/ids.ts";
import { app, testing } from "#testing.ts";

export const pieceApp = app([pieces]);

export const it = testing(pieceApp);

export const voyage = VoyageId.make("voyage-1");

export const elsewhere = VoyageId.make("voyage-2");

export const pieceId = (index: number): PieceIdentity => PieceId.make(`piece-${index}`);

export const launched = (index: number, on: VoyageIdentity = voyage) =>
	({ id: pieceId(index), parkedReason: null, status: "launched", title: `Piece ${index}`, voyageId: on }) as const;
