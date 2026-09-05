import { changesLayer } from "@antumbra/changes";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { it } from "@antumbra/persistence/testing";
import { PiecesLive } from "@antumbra/pieces";
import { ReposLive } from "@antumbra/repos";
import { expect } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { Quay } from "#quay/service.ts";

const QuayLayer = Quay.layer.pipe(
	Layer.provide(changesLayer(new Map(), new Map())),
	Layer.provide(ReposLive),
	Layer.provide(PiecesLive),
	Layer.provide(DomainFeedsLive),
);

it.effectDB("reads every berthing and resolves only the originating root session", function* (db) {
	for (const id of ["voyage-one", "voyage-two", "voyage-empty"]) {
		yield* db.Voyage.create({ id, name: id, captainBackend: "scripted", crewBackend: "scripted", context: "reef", northStar: "chart the reef" });
	}
	for (const id of ["piece-one", "piece-empty"]) {
		yield* db.Piece.create({
			id,
			title: id,
			charter: "chart",
			expectation: "charted",
			role: "hand",
			launchedAt: null,
			parkedAt: null,
			createdAt: new Date(id === "piece-one" ? "2026-09-01T00:00:00.000Z" : "2026-09-02T00:00:00.000Z"),
		});
		yield* db.VoyagePiece.create({ pieceId: id, voyageId: "voyage-one" });
	}
	yield* db.Piece.create({
		id: "unberthed",
		title: "unberthed",
		charter: "chart",
		expectation: "charted",
		role: "hand",
		launchedAt: null,
		parkedAt: null,
	});
	yield* db.VoyagePiece.create({ pieceId: "piece-one", voyageId: "voyage-two" });
	const empty = yield* Effect.flatMap(Quay, (quay) => quay.read()).pipe(Effect.provide(QuayLayer));
	expect(empty.rows).toEqual([]);
	expect(empty.pieces).toEqual([
		{ id: "piece-one", title: "piece-one", voyageName: "voyage-one" },
		{ id: "piece-one", title: "piece-one", voyageName: "voyage-two" },
		{ id: "piece-empty", title: "piece-empty", voyageName: "voyage-one" },
	]);
	for (const session of [
		{ id: "origin", status: "closed", rootSessionId: "origin", parentSessionId: null },
		{ id: "child", status: "open", rootSessionId: "origin", parentSessionId: "origin" },
		{ id: "newer", status: "open", rootSessionId: "newer", parentSessionId: null },
	]) {
		yield* db.AgentSession.create({
			...session,
			agentId: "opener",
			backend: "scripted",
			cwd: "/tmp/quay",
			executionStatus: "idle",
			nativeRef: null,
			outcome: null,
			label: null,
			kind: null,
			charterDeliveredAt: null,
		});
	}
	yield* db.Repo.create({ id: "repo-known", name: "repo-known", source: "/repos/known", defaultRef: "main" });
	yield* db.Repo.create({ id: "repo-unrelated", name: "repo-unrelated", source: "/repos/unrelated", defaultRef: "main" });
	const cases = [
		{ id: "landed", originSessionId: null, openedByAgentId: null },
		{ id: "dismissed", originSessionId: null, openedByAgentId: null },
		{ id: "withdrawn", originSessionId: null, openedByAgentId: null },
		{ id: "unberthed", originSessionId: null, openedByAgentId: null },
		{ id: "root-change", originSessionId: "origin", openedByAgentId: "opener" },
		{ id: "child-change", originSessionId: "child", openedByAgentId: "opener" },
		{ id: "other-opener", originSessionId: "origin", openedByAgentId: "another-agent" },
	];
	for (const change of cases) {
		yield* db.Change.create({
			...change,
			repoId: change.id === "root-change" ? "repo-known" : "unregistered-repo",
			host: "github",
			title: change.id,
			body: "chart",
			headRef: "chart",
			baseRef: "main",
			stage: change.id === "landed" ? "landed" : "open",
			checks: "green",
			review: "approved",
			mergeable: "clean",
			activityAt: new Date("2026-09-05T09:00:00.000Z"),
			observedAt: new Date("2026-09-05T09:00:00.000Z"),
		});
		yield* db.PieceChange.create({ changeId: change.id, pieceId: change.id === "unberthed" ? "unberthed" : "piece-one", purpose: "produces" });
	}
	yield* db.Change.where({ id: "withdrawn" }).update({ stage: "withdrawn" });
	yield* db.ChangeVerdict.create({ changeId: "dismissed", verdict: "dismissed" });
	const reading = yield* Effect.flatMap(Quay, (quay) => quay.read()).pipe(Effect.provide(QuayLayer));
	expect(reading.pieces).toEqual(empty.pieces);
	expect(new Set(reading.rows.map((row) => row.change.id))).toEqual(new Set(["root-change", "child-change", "other-opener", "withdrawn"]));
	expect(reading.rows.filter((row) => row.change.id === "withdrawn").map((row) => row.group)).toEqual(["needsAttention", "needsAttention"]);
	expect(reading.rows.filter((row) => row.change.id === "root-change").map((row) => row.originSessionId)).toEqual(["origin", "origin"]);
	expect(
		reading.rows.filter((row) => row.change.id === "child-change" || row.change.id === "other-opener").map((row) => row.originSessionId),
	).toEqual([null, null, null, null]);
	expect(reading.rows.filter((row) => row.change.id === "root-change").every((row) => row.change.repoName === "repo-known")).toBe(true);
	expect(reading.rows.filter((row) => row.change.id !== "root-change").every((row) => row.change.repoName === "unregistered-repo")).toBe(true);
});
