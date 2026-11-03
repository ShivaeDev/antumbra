import { Schema } from "effect";
import { PieceChartered, PieceLaunched, PieceParked, PieceRewired, PieceUnparked, PieceVerdictLanded } from "#piece.ts";
import { PieceProgressObserved } from "#piece-evidence.ts";

export const PieceEvent = Schema.Union([
	Schema.Struct({ _tag: Schema.tag("PieceChartered"), ...PieceChartered.fields }),
	Schema.Struct({ _tag: Schema.tag("PieceLaunched"), ...PieceLaunched.fields }),
	Schema.Struct({ _tag: Schema.tag("PieceParked"), ...PieceParked.fields }),
	Schema.Struct({ _tag: Schema.tag("PieceUnparked"), ...PieceUnparked.fields }),
	Schema.Struct({ _tag: Schema.tag("PieceRewired"), ...PieceRewired.fields }),
	Schema.Struct({ _tag: Schema.tag("PieceVerdictLanded"), ...PieceVerdictLanded.fields }),
	Schema.Struct({ _tag: Schema.tag("PieceProgressObserved"), ...PieceProgressObserved.fields }),
]);
