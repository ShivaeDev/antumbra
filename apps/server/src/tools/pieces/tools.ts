import { launchPiece, parkPiece, unparkPiece } from "#tools/pieces/acts.ts";
import { charterPiece } from "#tools/pieces/charter.ts";
import { rewirePiece } from "#tools/pieces/rewire.ts";

export const captainPieceTools = [charterPiece, launchPiece, parkPiece, unparkPiece, rewirePiece] as const;
