import { Database } from "@antumbra/persistence";
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
	type ScriptedBackend,
	type ScriptedSession,
	sessionFor,
} from "#test/harness.ts";
import { makeScriptedHost } from "#test/scripted-host.ts";
import { assignedPieces, eventually, PATIENCE, stateOf } from "#test/voyage-fixtures.ts";

const crewOn = (scripted: ScriptedBackend, pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = (yield* db.PieceAgent.where({ pieceId }).all())[0];
		return row === undefined ? yield* Effect.fail("no crew yet") : yield* sessionFor(scripted, row.agentId);
	});

const chartered = (captain: ScriptedSession, title: string, dependsOn: ReadonlyArray<string>) =>
	Effect.gen(function* () {
		const outcome = yield* callTool(captain, "charter_piece", {
			charter: `do ${title}`,
			dependsOn,
			expectation: `${title} is landed`,
			role: "hand",
			title,
		});
		expect(outcome.ok).toBe(true);
		const pieceId = outcome.text.replace("chartered ", "");
		expect(yield* callTool(captain, "launch_piece", { pieceId })).toMatchObject({ ok: true });
		return pieceId;
	});

const openReef = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	yield* domain.repos.register({ defaultRef: "main", source: REEF_SOURCE });
	return yield* domain.voyages.open({
		backend: "scripted",
		context: "the reef is uncharted",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
});

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
			const domain = yield* AgentDomain;
			const voyage = yield* openReef;
			yield* domain.repos.register({
				defaultRef: "main",
				source: "/somewhere/shoals",
			});
			const piece = yield* domain.voyages.charterPiece({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "hand",
				title: "alpha",
				voyageId: voyage.id,
			});
			yield* domain.voyages.launch(piece.id);
			const crew = yield* eventually(crewOn(backend, piece.id));

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

// why: the whole page — a captain charters a chain, crew opens a change and
// stands down, the app is killed and rebuilt while the host does its work,
// and the chain still sails on the next boot with nobody left to remember it.
it.live("a chain gated on a change sails across a boot", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		const scripted = yield* makeScriptedHost();
		const sailing = dispatchingLayer(temporary, backend.backend, PATIENCE, {}, recorder.runner, changeHostsOf(scripted.host));

		const chain = yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const voyage = yield* openReef;
			const repo = (yield* domain.repos.list)[0];
			if (repo === undefined) {
				return yield* Effect.fail("the reef was not registered");
			}
			const hailed = yield* domain.voyages.hail(voyage.id);
			const captain = yield* eventually(sessionFor(backend, hailed.agentId));
			const alpha = yield* chartered(captain, "alpha", []);
			const bravo = yield* chartered(captain, "bravo", [alpha]);

			const crew = yield* eventually(crewOn(backend, alpha));
			expect((yield* opened(crew, "reef")).ok).toBe(true);
			expect(yield* callTool(crew, "stand_down", undefined)).toEqual({
				ok: true,
				text: "standing by",
			});
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* stateOf(voyage.id, alpha)).toBe("landing");
					expect(yield* stateOf(voyage.id, bravo)).toBe("blocked");
				}),
			);
			return { alpha, bravo, repo, voyage };
		}).pipe(Effect.provide(sailing));

		yield* scripted.drive.transition(chain.repo.id, "1", { stage: "landed" });

		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			yield* domain.changes.refresh("scripted");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* stateOf(chain.voyage.id, chain.alpha)).toBe("done");
					expect(yield* assignedPieces).toContain(chain.bravo);
				}),
			);
		}).pipe(Effect.provide(sailing));
	}),
);
