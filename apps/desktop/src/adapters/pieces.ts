import { DomainFeeds } from "@antumbra/domain-feeds";
import type { pieces } from "@antumbra/domain-pieces/feature.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Database } from "@antumbra/persistence";
import { Pieces, type PiecesService } from "@antumbra/pieces";
import { assigningAgent } from "@antumbra/pieces/assign-agent";
import { PieceNotFound } from "@antumbra/pieces/errors";
import type { CharterInput, PieceRow } from "@antumbra/pieces/model";
import type { Api } from "@antumbra/platform-rpc/client.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import type { PieceVerdict } from "@antumbra/platform-vocabulary/verdict.ts";
import { type Context, Effect, Layer, Option } from "effect";
import { actRefused, charterRefused, type Refused, rewireRefused } from "#adapters/piece-refusals.ts";
import { edgeOf, pieceOf, verdictsOf } from "#adapters/piece-rows.ts";
import { once, ServerReach } from "#adapters/server-reach.ts";

type Reach<Failure> = Api<readonly [typeof pieces], Failure>;

type Feeds = Effect.Success<typeof DomainFeeds>;

type Store = Effect.Success<typeof Database>;

export const piecesOver = <Failure extends Refused>(reach: Reach<Failure>, store: Store, feeds: Feeds): PiecesService => {
	const listed = () => Effect.map(once(reach.pieces.all({})), (stored) => stored.map(pieceOf));
	const held = (pieceId: string) =>
		Effect.map(once(reach.pieces.byId({ id: PieceId.make(pieceId) })), (stored) => (stored === null ? Option.none() : Option.some(pieceOf(stored))));
	const berthed = (voyageId: string) =>
		Effect.map(once(reach.pieces.byVoyage({ voyageId: VoyageId.make(voyageId) })), (stored) => stored.map(pieceOf));
	const acted = <A, Refusal>(act: Effect.Effect<A, Refusal>) => Effect.tap(act, () => feeds.publishVoyageRefresh());
	return {
		assignAgent: assigningAgent(store, feeds),
		byId: held,
		byVoyage: berthed,
		charter: Effect.fn("Pieces.charter")(function* (input: CharterInput) {
			const requestId = Id.Request.make(input.id ?? Id.make());
			yield* reach.pieces
				.charter({ ...input, requestId, voyageId: VoyageId.make(input.voyageId) })
				.pipe(Effect.catch(charterRefused(input.voyageId)));
			yield* feeds.publishVoyageRefresh();
			const chartered = yield* held(requestId);
			return yield* Option.match(chartered, {
				onNone: () => Effect.die(new Error(`the journal chartered piece ${requestId} and does not hold it`)),
				onSome: (piece: PieceRow) => Effect.succeed(piece),
			});
		}),
		edges: (voyageId: string) => Effect.map(once(reach.pieces.edges({ voyageId: VoyageId.make(voyageId) })), (stored) => stored.map(edgeOf)),
		landVerdict: (pieceId: string, verdict: PieceVerdict) =>
			acted(reach.pieces.landVerdict({ id: PieceId.make(pieceId), verdict }).pipe(Effect.catch(actRefused(pieceId)))),
		launch: (pieceId: string) => acted(reach.pieces.launch({ id: PieceId.make(pieceId) }).pipe(Effect.catch(actRefused(pieceId)))),
		list: listed,
		membersOfVoyage: (voyageId: string) => Effect.map(berthed(voyageId), (berth): ReadonlySet<string> => new Set(berth.map((piece) => piece.id))),
		park: (pieceId: string, parked: boolean) => {
			const id = PieceId.make(pieceId);
			return acted((parked ? reach.pieces.park({ id }) : reach.pieces.unpark({ id })).pipe(Effect.catch(actRefused(pieceId))));
		},
		setDependencies: (pieceId: string, dependsOn: ReadonlyArray<string>) =>
			acted(reach.pieces.rewire({ dependsOn, id: PieceId.make(pieceId) }).pipe(Effect.catch(rewireRefused(pieceId)))),
		verdicts: (pieceIds: ReadonlyArray<string>) => Effect.map(listed(), (all) => verdictsOf(all, pieceIds)),
		verifyExists: Effect.fn("Pieces.verifyExists")(function* (pieceId: string) {
			if (Option.isNone(yield* held(pieceId))) {
				return yield* new PieceNotFound({ pieceId });
			}
		}),
	};
};

export const PiecesOverRpc: Layer.Layer<
	Pieces,
	never,
	Context.Service.Identifier<typeof Database> | Context.Service.Identifier<typeof DomainFeeds> | ServerReach
> = Layer.effect(Pieces)(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const store = yield* Database;
		return piecesOver(yield* ServerReach, store, feeds);
	}),
);
