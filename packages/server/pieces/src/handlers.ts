import {
	All,
	ById,
	ByVoyage,
	Dependencies,
	DisplayByVoyage,
	Edges,
	Others,
	PiecesContract,
	Progress,
	Reach,
	Ready,
} from "@antumbra/server-pieces/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { Pieces } from "#service.ts";

const unexpectedCharter = (error: Effect.Error<ReturnType<(typeof Pieces.Service)["charter"]>>) =>
	error._tag !== "Blank" &&
	error._tag !== "UnknownVoyage" &&
	error._tag !== "UnknownDependency" &&
	error._tag !== "WouldCycle" &&
	error._tag !== "AlreadyDone";
const unexpectedRewire = (error: Effect.Error<ReturnType<(typeof Pieces.Service)["rewire"]>>) =>
	error._tag !== "Unknown" && error._tag !== "UnknownDependency" && error._tag !== "WouldCycle" && error._tag !== "AlreadyDone";

export const handlers = PiecesContract.application.toLayer(
	Effect.gen(function* () {
		const pieces = yield* Pieces;
		return PiecesContract.application.of({
			"pieces.charter": (input) => pieces.charter(input).pipe(Effect.catchIf(unexpectedCharter, Effect.die)),
			"pieces.launch": (input) =>
				pieces.launch(input).pipe(Effect.catchIf((error) => error._tag !== "Unknown" && error._tag !== "AlreadyDone", Effect.die)),
			"pieces.park": (input) =>
				pieces.park(input).pipe(Effect.catchIf((error) => error._tag !== "Unknown" && error._tag !== "AlreadyDone", Effect.die)),
			"pieces.unpark": (input) =>
				pieces.unpark(input).pipe(Effect.catchIf((error) => error._tag !== "Unknown" && error._tag !== "AlreadyDone", Effect.die)),
			"pieces.rewire": (input) => pieces.rewire(input).pipe(Effect.catchIf(unexpectedRewire, Effect.die)),
			"pieces.landVerdict": (input) =>
				pieces.landVerdict(input).pipe(Effect.catchIf((error) => error._tag !== "Unknown" && error._tag !== "AlreadyDone", Effect.die)),
			"pieces.all": () => stream(readKeys(All.reads({})))(pieces.all().pipe(Effect.orDie)),
			"pieces.byId": (input) => stream(readKeys(ById.reads(input)))(pieces.byId(input).pipe(Effect.orDie)),
			"pieces.byVoyage": (input) => stream(readKeys(ByVoyage.reads(input)))(pieces.byVoyage(input).pipe(Effect.orDie)),
			"pieces.others": (input) => stream(readKeys(Others.reads(input)))(pieces.others(input).pipe(Effect.orDie)),
			"pieces.reach": (input) => stream(readKeys(Reach.reads(input)))(pieces.reach(input).pipe(Effect.orDie)),
			"pieces.edges": (input) => stream(readKeys(Edges.reads(input)))(pieces.edges(input).pipe(Effect.orDie)),
			"pieces.dependencies": (input) => stream(readKeys(Dependencies.reads(input)))(pieces.dependencies(input).pipe(Effect.orDie)),
			"pieces.progress": (input) => stream(readKeys(Progress.reads(input)))(pieces.progress(input).pipe(Effect.orDie)),
			"pieces.displayByVoyage": (input) => stream(readKeys(DisplayByVoyage.reads(input)))(pieces.displayByVoyage(input).pipe(Effect.orDie)),
			"pieces.ready": () => stream(readKeys(Ready.reads({})))(pieces.ready().pipe(Effect.orDie)),
		});
	}),
);
export const pieces = handlers.pipe(Layer.provideMerge(Pieces.layer));
