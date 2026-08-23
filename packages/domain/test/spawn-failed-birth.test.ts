import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { type AgentBackend, BackendFailure } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	makeScriptedRunner,
} from "#test/harness.ts";
import { openReefVoyage, stateOf } from "#test/voyage-fixtures.ts";

const TERMINAL: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
]);

const untilTerminal = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(
		Stream.takeUntil((status) => TERMINAL.has(status)),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

const birth = (
	suffix: string,
	pieceId: string,
	voyageId: string,
): SpawnFields => ({
	agentId: `agent-${suffix}`,
	backend: "scripted",
	charter: "sound the shallows",
	pieceId,
	role: "hand",
	runner: "local",
	sessionId: `session-${suffix}`,
	voyageId,
});

// why: registration stakes the Piece before the birth settles, so two attempts
// that never drew breath used to leave two dormant Agents standing against one
// Piece. What a Piece should hold afterwards is nothing at all.
it.live("births that fail leave no claim standing on their Piece", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const denying: AgentBackend = {
			...scripted.backend,
			openSession: () =>
				Effect.fail(
					new BackendFailure({ detail: "open denied", tag: "scripted" }),
				),
		};
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const domain = yield* AgentDomain;
			yield* domain.repos.register({
				defaultRef: "main",
				source: "/somewhere/repo",
			});
			const voyage = yield* openReefVoyage;
			const piece = yield* domain.voyages.charterPiece({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "hand",
				title: "alpha",
				voyageId: voyage.id,
			});
			yield* domain.voyages.launch(piece.id);

			for (const suffix of ["stillborn-one", "stillborn-two"]) {
				const submission = yield* kernel.submit(
					domain.spawn,
					birth(suffix, piece.id, voyage.id),
				);
				expect(yield* untilTerminal(submission.changes)).toBe("failed");
				expect(
					Option.getOrThrow(
						yield* db.Agent.where({ id: `agent-${suffix}` }).first(),
					).status,
				).toBe("dormant");
				const intent = yield* db.Intent.where({ id: submission.id }).first();
				expect(Option.getOrThrow(intent).detail).toContain("open denied");
			}

			expect(yield* db.PieceAgent.where({ pieceId: piece.id }).all()).toEqual(
				[],
			);
			expect(yield* stateOf(voyage.id, piece.id)).toBe("ready");
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, denying, {}, recorded.runner),
			),
		);
	}),
);
