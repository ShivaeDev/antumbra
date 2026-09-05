import { ChangesLive } from "@antumbra/changes";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { persistenceIt } from "@antumbra/persistence/testing";
import { PiecesLive } from "@antumbra/pieces";
import { ReposLive } from "@antumbra/repos";
import { expect } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { Quay } from "#quay/service.ts";

const it = persistenceIt();
const QuayLayer = Quay.layer.pipe(
	Layer.provide(ChangesLive(new Map(), new Map())),
	Layer.provide(ReposLive),
	Layer.provide(PiecesLive),
	Layer.provide(DomainFeedsLive),
);

it.effectDB("reads every berthing and resolves only the originating root session", function* (db) {
	for (const id of ["voyage-one", "voyage-two"]) {
		yield* db.Voyage.create({ id, name: id, captainBackend: "scripted", crewBackend: "scripted", context: "reef", northStar: "chart the reef" });
	}
	for (const id of ["piece-one", "piece-empty"]) {
		yield* db.Piece.create({ id, title: id, charter: "chart", expectation: "charted", role: "hand", launchedAt: null, parkedAt: null });
		yield* db.VoyagePiece.create({ pieceId: id, voyageId: "voyage-one" });
	}
	yield* db.VoyagePiece.create({ pieceId: "piece-one", voyageId: "voyage-two" });
	const empty = yield* Effect.flatMap(Quay, (quay) => quay.read()).pipe(Effect.provide(QuayLayer));
	expect(empty.rows).toEqual([]);
	expect(empty.pieces).toEqual([
		{ id: "piece-one", title: "piece-one", voyageName: "voyage-one" },
		{ id: "piece-one", title: "piece-one", voyageName: "voyage-two" },
		{ id: "piece-empty", title: "piece-empty", voyageName: "voyage-one" },
	]);
	for (const id of ["origin", "child", "newer"]) {
		yield* db.AgentSession.create({
			id,
			agentId: "opener",
			backend: "scripted",
			cwd: "/tmp/quay",
			status: id === "origin" ? "closed" : "open",
			executionStatus: "idle",
			rootSessionId: id === "child" ? "origin" : id,
			parentSessionId: id === "child" ? "origin" : null,
			nativeRef: null,
			outcome: null,
			label: null,
			kind: null,
			charterDeliveredAt: null,
		});
	}
	const cases = [
		{ id: "root-change", originSessionId: "origin", openedByAgentId: "opener" },
		{ id: "child-change", originSessionId: "child", openedByAgentId: "opener" },
		{ id: "other-opener", originSessionId: "origin", openedByAgentId: "another-agent" },
	];
	for (const change of cases) {
		yield* db.Change.create({
			...change,
			repoId: "unregistered-repo",
			host: "github",
			title: change.id,
			body: "chart",
			headRef: "chart",
			baseRef: "main",
			stage: "open",
			checks: "green",
			review: "approved",
			mergeable: "clean",
			activityAt: new Date("2026-09-05T09:00:00.000Z"),
			observedAt: new Date("2026-09-05T09:00:00.000Z"),
		});
		yield* db.PieceChange.create({ changeId: change.id, pieceId: "piece-one", purpose: "produces" });
	}
	const reading = yield* Effect.flatMap(Quay, (quay) => quay.read()).pipe(Effect.provide(QuayLayer));
	expect(reading.pieces).toEqual(empty.pieces);
	expect(reading.rows.filter((row) => row.change.id === "root-change").map((row) => row.originSessionId)).toEqual(["origin", "origin"]);
	expect(reading.rows.filter((row) => row.change.id !== "root-change").map((row) => row.originSessionId)).toEqual([null, null, null, null]);
	expect(reading.rows.every((row) => row.change.repoName === "unregistered-repo")).toBe(true);
});
