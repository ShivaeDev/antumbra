import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { Database } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import {
	acquireTemporaryPersistence,
	callTool,
	dispatchingLayer,
	makeScriptedBackend,
	sessionFor,
	standDown,
} from "#test/harness.ts";
import { chain, eventually, PATIENCE, stateOf } from "#test/voyage-fixtures.ts";

const acquireMoorage = Effect.acquireRelease(
	Effect.sync(() => mkdtempSync(join(tmpdir(), "antumbra-moorage-"))),
	(root) => Effect.sync(() => rmSync(root, { force: true, recursive: true })),
);

const runnerAt = (root: string): Runner => ({
	captureChange: (berth) =>
		Effect.succeed({
			branch: berth.branch,
			headSha: `sha-${berth.branch}`,
			workingDiff: "",
			workingTreeStatus: "",
			worktreePath: berth.path,
		}),
	capabilities: { liveTerminal: false },
	plan: () => ({ berths: [], root }),
	provision: () => Effect.void,
	reclaim: () => Effect.succeed({ _tag: "reclaimed" as const }),
	scrap: () => Effect.void,
	tag: "local",
});

it.live("a landed local artifact survives removal of its moorage", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const root = yield* acquireMoorage;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const { alpha, voyage } = yield* chain;
			const assignment = yield* eventually(
				db.PieceAgent.where({ pieceId: alpha.id })
					.first()
					.pipe(Effect.filterOrFail(Option.isSome)),
			);
			const session = yield* eventually(
				sessionFor(scripted, assignment.value.agentId),
			);
			const source = join(root, "reef.md");
			writeFileSync(source, "# Reef\n");

			expect(
				yield* callTool(session, "land_artifact", {
					path: "reef.md",
					title: "reef chart",
				}),
			).toEqual({
				ok: true,
				text: "artifact landed; other current artifacts: none; call supersede if this is a new version",
			});
			// why: the artifact is the outcome, but the hand that landed it is still
			// aboard, and a piece is shipped only when all of its work is done. What
			// this rehearsal is about is the file outliving its moorage, so the crew
			// says it is finished and the reading settles on done.
			yield* standDown(scripted, assignment.value.agentId);
			expect(yield* stateOf(voyage.id, alpha.id)).toBe("done");

			const artifact = (yield* db.Artifact.all())[0];
			const published = join(
				dirname(temporary.database),
				"artifacts",
				artifact?.digest ?? "",
				artifact?.basename ?? "",
			);
			expect(relative(root, published).startsWith("..")).toBe(true);

			rmSync(root, { force: true, recursive: true });
			expect(existsSync(source)).toBe(false);
			expect(existsSync(published)).toBe(true);
			expect((yield* db.Artifact.all())[0]?.id).toBe(artifact?.id);
			expect(yield* stateOf(voyage.id, alpha.id)).toBe("done");
		}).pipe(
			Effect.provide(
				dispatchingLayer(
					temporary,
					scripted.backend,
					PATIENCE,
					{},
					runnerAt(root),
				),
			),
		);
	}),
);
