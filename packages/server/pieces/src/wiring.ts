import { rewire } from "@antumbra/domain-pieces/commands/rewire.ts";
import { DEPENDS_ON, WOULD_CYCLE } from "@antumbra/domain-pieces/commands/wiring.ts";
import { PieceId } from "@antumbra/platform-vocabulary/piece.ts";
import { downstreamOf } from "@antumbra/platform-vocabulary/piece-wiring.ts";
import { PieceHistory } from "@antumbra/server-storage/pieces/service.ts";
import { Effect } from "effect";

export const wiring = Effect.fn("Pieces.wiring")(function* (id: PieceId, dependsOn: readonly string[]) {
	const history = yield* PieceHistory;
	const downstream = downstreamOf(yield* history.edges(), id);
	const wanted: PieceId[] = [];
	for (const named of dependsOn) {
		const dependency = PieceId.make(named);
		if (wanted.includes(dependency)) continue;
		if ((yield* history.byId(dependency)) === null) return yield* rewire.reject.UnknownDependency({ pieceId: dependency });
		if (downstream.has(dependency)) return yield* rewire.reject.WouldCycle({ field: DEPENDS_ON, from: dependency, message: WOULD_CYCLE, to: id });
		wanted.push(dependency);
	}
	return wanted;
});
