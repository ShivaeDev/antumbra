import { Database } from "@antumbra/persistence";
import { Effect, Result } from "effect";
import { changeRow } from "#change-read.ts";
import { pieceChangeRow } from "#change-rows.ts";
import { heldBerths } from "#held-berths.ts";

const rightValues = <A, E>(
	values: ReadonlyArray<Result.Result<A, E>>,
): ReadonlyArray<A> =>
	values.flatMap((value) => (Result.isSuccess(value) ? [value.success] : []));

const leftValues = <A, E>(
	values: ReadonlyArray<Result.Result<A, E>>,
): ReadonlyArray<E> =>
	values.flatMap((value) => (Result.isFailure(value) ? [value.failure] : []));

export const readBerthSweep = Effect.gen(function* () {
	const db = yield* Database;
	const ready = yield* db.Berth.where({ status: "ready" }).all();
	const stranded = yield* db.Berth.where({ status: "stranded" }).all();
	const storedChanges = yield* db.Change.all();
	const storedPieceChanges = yield* db.PieceChange.all();
	const decodedChanges = yield* Effect.forEach(storedChanges, (row) =>
		Effect.result(changeRow(row)),
	);
	const decodedPieceChanges = yield* Effect.forEach(storedPieceChanges, (row) =>
		Effect.result(pieceChangeRow(row)),
	);
	const repos = yield* db.Repo.all();
	const changes = rightValues(decodedChanges);
	const pieceChanges = rightValues(decodedPieceChanges);
	const held = new Map(
		heldBerths([...ready, ...stranded], changes, repos, pieceChanges),
	);
	const repoOfSource = new Map(
		repos.map((repo) => [repo.source, repo.id] as const),
	);
	const rawChangeById = new Map(
		storedChanges.map((change) => [change.id, change] as const),
	);
	const unsafeChangeIds = new Set([
		...leftValues(decodedChanges).map((failure) => failure.changeId),
		...leftValues(decodedPieceChanges).map((failure) => failure.changeId),
	]);
	const unsafeChanges = [...unsafeChangeIds].flatMap((changeId) => {
		const change = rawChangeById.get(changeId);
		return change === undefined ? [] : [change];
	});
	// why: an invalid row cannot decide whether a Change still holds its Berth.
	// Hold only the matching Berth from its still-readable identity evidence;
	// unrelated resources may continue through the boot sweep.
	for (const berth of [...ready, ...stranded]) {
		const repoId = repoOfSource.get(berth.source);
		const unsafe = unsafeChanges.find(
			(change) => change.repoId === repoId && change.headRef === berth.branch,
		);
		if (unsafe !== undefined) {
			held.set(berth.id, unsafe.id);
		}
	}
	for (const failure of [
		...leftValues(decodedChanges),
		...leftValues(decodedPieceChanges),
	]) {
		yield* Effect.logWarning("berth sweep held an invalid durable row", {
			failure: failure.message,
		});
	}
	return {
		held,
		ready,
		stranded,
	};
});
