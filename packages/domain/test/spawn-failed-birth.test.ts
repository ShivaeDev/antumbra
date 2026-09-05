import { SettingsSource } from "@antumbra/contract";
import { type IntentStatus, isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { type AgentBackend, BackendFailure } from "@antumbra/plugin-api";
import { Repos } from "@antumbra/repos";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { makeScriptedBackend, makeScriptedRunner } from "#test/harness.ts";
import { openReefVoyage, stateOf } from "#test/voyage-fixtures.ts";

const untilTerminal = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow));

const birth = (suffix: string, pieceId: string, voyageId: string): SpawnFields => ({
	agentId: `agent-${suffix}`,
	backend: "scripted",
	charter: "sound the shallows",
	pieceId,
	role: "hand",
	runner: "local",
	sessionId: `session-${suffix}`,
	voyageId,
});

// Regression: two failed births once left two dormant Agents assigned to one Piece.
it.effectApp.withProviders(
	"births that fail leave no claim standing on their Piece",
	Effect.gen(function* () {
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const denying: AgentBackend = {
			...scripted.backend,
			openSession: () => Effect.fail(new BackendFailure({ detail: "open denied", tag: "scripted" })),
		};
		return {
			providers: { backends: new Map([[denying.tag, denying]]), runners: new Map([[recorded.runner.tag, recorded.runner]]) },
			state: undefined,
		};
	}),
	function* () {
		const settings = yield* SettingsSource;
		yield* settings.change({ key: "holdPieceDispatch", value: true });
		const pieces = yield* Pieces;
		const db = yield* Database;
		const kernel = yield* Kernel;
		const domain = yield* AgentDomain;
		const repos = yield* Repos;
		yield* repos.register({
			defaultRef: "main",
			source: "/somewhere/repo",
		});
		const voyage = yield* openReefVoyage;
		const piece = yield* pieces.charter({
			charter: "sound the shallows",
			dependsOn: [],
			expectation: "soundings are landed",
			role: "hand",
			title: "alpha",
			voyageId: voyage.id,
		});
		yield* pieces.launch(piece.id);

		const failBirth = (suffix: string) =>
			Effect.gen(function* () {
				const payload = birth(suffix, piece.id, voyage.id);
				const submission = yield* kernel.submit(domain.spawn, payload);
				expect(yield* untilTerminal(submission.changes)).toBe("failed");
				expect(Option.getOrThrow(yield* db.Agent.where({ id: `agent-${suffix}` }).first()).status).toBe("dormant");
				const intent = yield* db.Intent.where({ id: submission.id }).first();
				expect(Option.getOrThrow(intent).detail).toContain("open denied");
			});
		yield* failBirth("stillborn-one");
		yield* failBirth("stillborn-two");

		expect(yield* db.PieceAgent.where({ pieceId: piece.id }).all()).toEqual([]);
		expect(yield* stateOf(voyage.id, piece.id)).toBe("ready");
	},
);
