import type { PieceState, PieceView, VoyageCaptainView } from "@antumbra/contract";

export const captainAtWork = (captain: VoyageCaptainView | null): captain is VoyageCaptainView => captain?.atWork === true;

const WORKABLE: ReadonlySet<PieceState> = new Set<PieceState>(["blocked", "done", "held", "landing"]);

export const worksNow = (piece: PieceView): boolean => WORKABLE.has(piece.state);
