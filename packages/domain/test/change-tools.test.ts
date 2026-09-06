import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Repos } from "@antumbra/repos";
import { it } from "@antumbra/testing";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { REEF_SOURCE } from "#test/change-fixtures.ts";
import { callTool, makeScriptedRunner, type ScriptedSession } from "#test/harness.ts";
import { makeScriptedHost } from "#test/scripted-host.ts";

const opened = (crew: ScriptedSession, repo: string) =>
	callTool(crew, "open_change", {
		body: "three fathoms at the eastern spit",
		repo,
		title: "chart the eastern spit",
	});

it.effectApp.withProviders(
	"crew open a change through the tool and hear where it lives",
	Effect.gen(function* () {
		const recorder = yield* makeScriptedRunner;
		const host = yield* makeScriptedHost({ supports: (repo) => repo.name === "reef" });
		return {
			providers: { runners: new Map([[recorder.runner.tag, recorder.runner]]), changeHosts: new Map([[host.host.tag, host.host]]) },
			state: undefined,
		};
	}),
	function* ({ scripted }) {
		const pieces = yield* Pieces;
		const db = yield* Database;
		const repos = yield* Repos;
		const voyageRecords = yield* Voyages;
		yield* repos.register({ defaultRef: "main", source: REEF_SOURCE });
		const voyage = yield* voyageRecords.open({
			context: "the reef is uncharted",
			name: "Chart the reef",
			northStar: "every shoal is known",
		});
		yield* repos.register({
			defaultRef: "main",
			source: "/somewhere/shoals",
		});
		const piece = yield* pieces.charter({
			charter: "sound the shallows",
			dependsOn: [],
			expectation: "soundings are landed",
			role: "hand",
			title: "alpha",
			voyageId: voyage.id,
		});
		yield* pieces.launch(piece.id);
		const queued = yield* scripted.queued;
		const session = Option.getOrThrow(yield* db.AgentSession.where({ id: queued.sessionId }).first());
		expect(yield* db.PieceAgent.where({ pieceId: piece.id, agentId: session.agentId }).all()).toHaveLength(1);
		const crew = Option.getOrThrow(Option.fromUndefinedOr(yield* scripted.session(queued.sessionId)));

		const submitted = yield* callTool(crew, "submit_change", {
			repo: "reef",
		});
		expect(submitted).toMatchObject({ ok: true });
		expect(submitted.text).toContain("change prepared: no url");

		const outcome = yield* opened(crew, "reef");
		expect(outcome.ok).toBe(true);
		expect(outcome.text).toContain("change open: ");
		expect(outcome.text).toContain("https://scripted.test/changes/1");

		const unclaimed = yield* opened(crew, "shoals");
		expect(unclaimed).toEqual({
			ok: false,
			text: "open_change: NoChangeHost: no change host claims shoals",
		});
	},
);
