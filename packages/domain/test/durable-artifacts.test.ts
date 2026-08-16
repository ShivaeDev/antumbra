import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
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
} from "#test/harness.ts";
import { chain, eventually, PATIENCE, stateOf } from "#test/voyage-fixtures.ts";

const acquireMoorage = Effect.acquireRelease(
	Effect.sync(() => mkdtempSync(join(tmpdir(), "antumbra-moorage-"))),
	(root) => Effect.sync(() => rmSync(root, { force: true, recursive: true })),
);

const runnerAt = (root: string): Runner => ({
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
			const source = join(root, "reef.svg");
			writeFileSync(source, "<svg>reef</svg>");

			expect(
				yield* callTool(session, "land_artifact", {
					title: "reef chart",
					uri: "reef.svg",
				}),
			).toEqual({ ok: true, text: "artifact landed" });
			expect(yield* stateOf(voyage.id, alpha.id)).toBe("done");

			const artifact = (yield* db.Artifact.all())[0];
			expect(artifact?.uri.startsWith("file:")).toBe(true);
			const published = fileURLToPath(artifact?.uri ?? "");
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
