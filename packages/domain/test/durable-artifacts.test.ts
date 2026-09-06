import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Artifacts } from "@antumbra/artifacts";
import type { Runner } from "@antumbra/plugin-api";
import { endsTurn, it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { callTool } from "#test/harness.ts";
import { chain, stateOf } from "#test/voyage-fixtures.ts";

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
	plan: () => ({ berths: [], root }),
	provision: () => Effect.void,
	reclaim: () => Effect.succeed({ _tag: "reclaimed" as const }),
	scrap: () => Effect.void,
	tag: "local",
});

it.effectApp.withProviders(
	"a landed local artifact survives removal of its moorage",
	Effect.gen(function* () {
		const root = yield* acquireMoorage;
		const runner = runnerAt(root);
		return { providers: { runners: new Map([[runner.tag, runner]]) }, state: root };
	}),
	function* ({ db, scripted }, root) {
		const artifacts = yield* Artifacts;
		const { alpha, voyage } = yield* chain;
		const queued = yield* scripted.queued;
		const row = Option.getOrThrow(yield* db.AgentSession.where({ id: queued.sessionId }).first());
		expect(yield* db.PieceAgent.where({ pieceId: alpha.id, agentId: row.agentId }).all()).toHaveLength(1);
		const session = Option.getOrThrow(Option.fromUndefinedOr(yield* scripted.session(queued.sessionId)));
		const source = join(root, "reef.md");
		writeFileSync(source, "# Reef\n");
		expect(yield* callTool(session, "land_artifact", { path: "reef.md", title: "reef chart" })).toEqual({
			ok: true,
			text: "artifact landed; other current artifacts: none; call supersede if this is a new version",
		});
		yield* endsTurn(scripted, queued.sessionId);
		expect(yield* stateOf(voyage.id, alpha.id)).toBe("done");

		const artifact = Option.getOrThrow(yield* db.Artifact.first());
		rmSync(root, { force: true, recursive: true });
		expect(existsSync(source)).toBe(false);
		expect(yield* artifacts.readMarkdown(artifact.id)).toMatchObject({ artifactId: artifact.id, markdown: "# Reef\n" });
		expect(Option.getOrThrow(yield* db.Artifact.first()).id).toBe(artifact.id);
		expect(yield* stateOf(voyage.id, alpha.id)).toBe("done");
	},
);
