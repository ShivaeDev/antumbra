import { Changes } from "@antumbra/changes";
import { SettingsSource } from "@antumbra/contract";
import { type IntentStatus, isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option, Result, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import { REEF_SOURCE, reefWithPiece } from "#test/change-fixtures.ts";
import { scriptedChangeHost } from "#test/change-submission-fixtures.ts";
import { scriptedObservation } from "#test/scripted-host.ts";

const untilTerminal = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow));

const seedAgentResources = (agentId: string, status: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Agent.create({
			charter: "claimed resources open no work",
			id: agentId,
			role: "keeper",
			status,
		});
		yield* db.Moorage.create({
			agentId,
			reclaimState: null,
			root: `/tmp/moorage/${agentId}`,
			runner: "local",
			status: "ready",
		});
		yield* db.Berth.create({
			agentId,
			branch: `work/${agentId}/berth-0`,
			id: `${agentId}:berth-0`,
			path: `/tmp/moorage/${agentId}/berth-0`,
			reclaimState: null,
			ref: "main",
			runner: "local",
			slug: "berth-0",
			source: REEF_SOURCE,
			status: "ready",
			strandedAt: null,
		});
	});

const claimAgentResources = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Moorage.where({ agentId }).update({ reclaimState: "claimed" });
		yield* db.Berth.where({ agentId }).update({ reclaimState: "claimed" });
	});

const expectClaimed = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const result = yield* Effect.result(effect);
		expect(Result.isFailure(result)).toBe(true);
		if (Result.isFailure(result)) {
			expect(result.failure).toMatchObject({
				_tag: "ResourceReclaimClaimed",
			});
		}
	});

it.effectApp.withProviders("prepare, open authorization, adoption, and observation reject a claim", scriptedChangeHost, function* () {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
	const changes = yield* Changes;
	const { piece, repo } = yield* reefWithPiece;
	yield* seedAgentResources("agent-boundary", "alive");
	yield* changes.submit({
		agentId: "agent-boundary",
		pieceId: piece.id,
		repoName: repo.name,
		sessionId: "session-boundary",
	});
	yield* claimAgentResources("agent-boundary");

	yield* expectClaimed(
		changes.open({
			agentId: "agent-boundary",
			base: null,
			body: "must not open",
			draft: false,
			pieceId: piece.id,
			repoName: repo.name,
			sessionId: "session-boundary",
			title: "claimed",
		}),
	);
	yield* expectClaimed(
		changes.adopt({
			agentId: "agent-boundary",
			pieceId: piece.id,
			repoName: repo.name,
			url: "https://scripted.test/changes/41",
		}),
	);
	yield* expectClaimed(
		changes.observed("scripted", [
			scriptedObservation("scripted", "41", {
				baseRef: "main",
				headRef: `work/agent-boundary/berth-0`,
				repoId: repo.id,
				title: "claimed",
			}),
		]),
	);
});

it.effectApp("spawn cannot write a new assignment through claimed resources", function* () {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
	const db = yield* Database;
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const { piece } = yield* reefWithPiece;
	yield* seedAgentResources("agent-assignment", "spawning");
	yield* claimAgentResources("agent-assignment");
	const spawn = yield* kernel.submit(domain.spawn, {
		agentId: "agent-assignment",
		backend: "scripted",
		charter: "must not be assigned",
		pieceId: piece.id,
		role: "keeper",
		runner: "local",
		sessionId: "session-assignment",
	});
	expect(yield* untilTerminal(spawn.changes)).toBe("failed");
	expect(
		yield* db.PieceAgent.where({
			agentId: "agent-assignment",
			pieceId: piece.id,
		}).all(),
	).toEqual([]);
});
