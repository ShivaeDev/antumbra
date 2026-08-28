import { BoardScope } from "@antumbra/boards";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { dispatchingLayer, domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	makeScriptedBackend,
	type ScriptedBackend,
	standDown,
} from "#test/harness.ts";
import { chain, eventually, PATIENCE, stateOf } from "#test/voyage-fixtures.ts";

const openedSession = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.AgentSession.all();
		const row = rows[0];
		if (row === undefined) {
			return yield* Effect.fail("no session yet");
		}
		const live = yield* scripted.session(row.id);
		return live === undefined
			? yield* Effect.fail("the session is not scripted")
			: { agentId: row.agentId, live };
	});

const spawnByHand = (payload: SpawnFields) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const domain = yield* AgentDomain;
		yield* kernel.submit(domain.spawn, payload);
	});

const HAND: SpawnFields = {
	agentId: "agent-hand",
	backend: "scripted",
	charter: "sound the shallows",
	role: "hand",
	runner: "local",
	sessionId: "session-hand",
};

it.live(
	"a crew member lands a report against the piece it was spawned for",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const { alpha, voyage } = yield* chain;
				const { agentId, live } = yield* eventually(openedSession(scripted));

				expect(live.tools.map((tool) => tool.name)).toEqual([
					"land_report",
					"read_report",
					"land_artifact",
					"supersede",
					"remove_supersession",
					"submit_change",
					"open_change",
					"adopt_change",
					"read_mail",
					"mark_read",
					"write_board",
					"read_board",
					"request_ruling",
					"stand_down",
				]);

				const outcome = yield* callTool(live, "land_report", {
					body: "the eastern shoal is charted",
					title: "soundings",
				});
				expect(outcome).toEqual({ ok: true, text: "report landed" });

				const reports = yield* db.Report.all();
				expect(reports).toMatchObject([
					{ authorAgentId: agentId, title: "soundings" },
				]);
				// why: the report is the outcome, but the hand that wrote it is still
				// aboard — a piece is shipped only when all of its work is done, so
				// the crew says it is finished before the piece can read done.
				yield* standDown(scripted, agentId);
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* stateOf(voyage.id, alpha.id)).toBe("done");
					}),
				);
			}).pipe(
				Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)),
			);
		}),
);

it.live("arguments the model got wrong come back as a refusal", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* chain;
			const { live } = yield* eventually(openedSession(scripted));
			const outcome = yield* callTool(live, "land_report", { title: 7 });
			expect(outcome.ok).toBe(false);
			expect(outcome.text).toContain("land_report");
			expect(yield* db.Report.all()).toEqual([]);
		}).pipe(
			Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)),
		);
	}),
);

it.live("a session with no piece has nothing to land against", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* spawnByHand(HAND);
			const { live } = yield* eventually(openedSession(scripted));
			expect(
				yield* callTool(live, "land_report", {
					body: "nowhere to put this",
					title: "adrift",
				}),
			).toEqual({ ok: false, text: "you are not on a piece" });
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("crew write to the board of their piece and of its voyage", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { alpha, voyage } = yield* chain;
			const { agentId, live } = yield* eventually(openedSession(scripted));

			expect(
				yield* callTool(live, "write_board", {
					body: "the shoal is steeper than charted",
					register: "smooth",
					scope: "piece",
				}),
			).toEqual({ ok: true, text: "written to the piece board" });
			expect(
				yield* callTool(live, "write_board", {
					body: "the swell is running",
					register: "rough",
					scope: "voyage",
				}),
			).toEqual({ ok: true, text: "written to the voyage board" });

			expect(
				yield* domain.boards.read(BoardScope.Piece({ pieceId: alpha.id })),
			).toMatchObject([
				{ authorAgentId: agentId, body: "the shoal is steeper than charted" },
			]);
			expect(yield* callTool(live, "read_board", { scope: "voyage" })).toEqual({
				ok: true,
				text: "[rough] the swell is running",
			});
			expect(
				yield* domain.boards.read(BoardScope.Voyage({ voyageId: voyage.id })),
			).toMatchObject([{ body: "the swell is running" }]);
		}).pipe(
			Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)),
		);
	}),
);

it.live("mail tools read without marking and receipt only when asked", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			yield* chain;
			const { agentId, live } = yield* eventually(openedSession(scripted));
			const entry = yield* domain.boards.mail({
				authorAgentId: Option.none(),
				body: "the admiral selected this mail",
				precedence: "priority",
				sourceRef: "selection:tool-test",
				toAgentId: agentId,
			});

			const first = yield* callTool(live, "read_mail", undefined);
			const second = yield* callTool(live, "read_mail", undefined);
			expect(first).toMatchObject({ ok: true });
			expect(first.text).toContain(entry.id);
			expect(second.text).toContain(entry.id);
			expect(
				yield* callTool(live, "mark_read", { entryIds: [entry.id] }),
			).toEqual({ ok: true, text: "marked read" });
			expect(yield* callTool(live, "read_mail", undefined)).toEqual({
				ok: true,
				text: "No mail.",
			});
		}).pipe(
			Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)),
		);
	}),
);

it.live("a session with no piece has no board but its own", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* spawnByHand(HAND);
			const { live } = yield* eventually(openedSession(scripted));
			expect(yield* callTool(live, "read_board", { scope: "voyage" })).toEqual({
				ok: false,
				text: "you have no voyage board",
			});
			expect(
				yield* callTool(live, "write_board", {
					body: "sounded nothing yet",
					register: "rough",
					scope: "self",
				}),
			).toEqual({ ok: true, text: "written to the self board" });
			expect(yield* callTool(live, "read_board", { scope: "self" })).toEqual({
				ok: true,
				text: "[rough] sounded nothing yet",
			});
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("standing down preserves the agent and session that called it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* spawnByHand(HAND);
			const { live } = yield* eventually(openedSession(scripted));
			const before = {
				agent: yield* db.Agent.where({ id: HAND.agentId }).first(),
				moorage: yield* db.Moorage.where({ agentId: HAND.agentId }).first(),
				session: yield* db.AgentSession.where({ id: HAND.sessionId }).first(),
			};
			expect(yield* callTool(live, "stand_down", undefined)).toEqual({
				ok: true,
				text: "standing by",
			});
			yield* eventually(
				Effect.gen(function* () {
					const agent = yield* db.Agent.where({ id: HAND.agentId }).first();
					const session = yield* db.AgentSession.where({
						id: HAND.sessionId,
					}).first();
					expect(Option.getOrThrow(agent).status).toBe("alive");
					expect(Option.getOrThrow(session).status).toBe("open");
					expect(Option.getOrThrow(session).executionStatus).toBe("idle");
				}),
			);
			// why: saying there is nothing left to do is not asking to be put
			// away, so the provider session the Agent called from is still the
			// one it is standing in.
			expect(yield* live.closed).toBe(false);
			expect(yield* db.Agent.where({ id: HAND.agentId }).first()).toEqual(
				before.agent,
			);
			expect(
				yield* db.Moorage.where({ agentId: HAND.agentId }).first(),
			).toEqual(before.moorage);
			const beforeSession = Option.getOrThrow(before.session);
			const settledSession = Option.getOrThrow(
				yield* db.AgentSession.where({ id: HAND.sessionId }).first(),
			);
			expect(settledSession).toEqual({
				...beforeSession,
				executionStatus: "idle",
			});
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
