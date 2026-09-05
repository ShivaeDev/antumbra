import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Repos } from "@antumbra/repos";
import { Voyages } from "@antumbra/voyages";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { REEF_SOURCE } from "#test/change-fixtures.ts";
import { dispatchingLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	changeHostsOf,
	makeScriptedBackend,
	makeScriptedRunner,
	type ScriptedSession,
	sessionFor,
} from "#test/harness.ts";
import { makeScriptedHost } from "#test/scripted-host.ts";
import { eventually, PATIENCE } from "#test/voyage-fixtures.ts";

const opened = (crew: ScriptedSession, repo: string) =>
	callTool(crew, "open_change", {
		body: "three fathoms at the eastern spit",
		repo,
		title: "chart the eastern spit",
	});

it.live("crew open a change through the tool and hear where it lives", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		const scripted = yield* makeScriptedHost({
			supports: (repo) => repo.name === "reef",
		});
		yield* Effect.gen(function* () {
			const pieces = yield* Pieces;
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const repos = yield* Repos;
			const voyageRecords = yield* Voyages;
			yield* repos.register({ defaultRef: "main", source: REEF_SOURCE });
			const voyage = yield* voyageRecords.open({
				backend: "scripted",
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
			const crew = yield* eventually(
				Effect.gen(function* () {
					const row = (yield* db.PieceAgent.where({ pieceId: piece.id }).all())[0];
					return row === undefined ? yield* Effect.fail("no crew yet") : yield* sessionFor(backend, row.agentId);
				}),
			);

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
		}).pipe(Effect.provide(dispatchingLayer(temporary, backend.backend, PATIENCE, {}, recorder.runner, changeHostsOf(scripted.host))));
	}),
);
