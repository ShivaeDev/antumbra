import { BoardScope, Boards } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend } from "#test/harness.ts";

const AGENT_ID = "agent-mailbox";

const createAgent = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Agent.create({
			charter: "take in addressed mail",
			id: agentId,
			role: "hand",
			status: "alive",
		});
	});

const addressedMail = (toAgentId = AGENT_ID) => ({
	authorAgentId: Option.none<string>(),
	body: "the admiral selected this for your attention",
	precedence: "priority" as const,
	sourceRef: "selection:attention-1",
	toAgentId,
});

it.live("addressed mail and its explicit receipt survive full rebuilds", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const entryId = yield* Effect.gen(function* () {
			const boards = yield* Boards;
			yield* createAgent(AGENT_ID);
			return (yield* boards.mail(addressedMail())).id;
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));

		yield* Effect.gen(function* () {
			const boards = yield* Boards;
			const first = yield* boards.unread(AGENT_ID);
			const second = yield* boards.unread(AGENT_ID);
			expect(first.map((entry) => entry.id)).toEqual([entryId]);
			expect(second.map((entry) => entry.id)).toEqual([entryId]);
			yield* boards.markRead(AGENT_ID, [entryId]);
			expect((yield* boards.read(BoardScope.Agent({ agentId: AGENT_ID }))).length).toBe(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));

		yield* Effect.gen(function* () {
			const boards = yield* Boards;
			expect(yield* boards.unread(AGENT_ID)).toEqual([]);
			expect((yield* boards.read(BoardScope.Agent({ agentId: AGENT_ID }))).map((entry) => entry.id)).toEqual([entryId]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("a stable source reference makes replay idempotent", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const firstId = yield* Effect.gen(function* () {
			const boards = yield* Boards;
			yield* createAgent(AGENT_ID);
			return (yield* boards.mail(addressedMail())).id;
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));

		yield* Effect.gen(function* () {
			const db = yield* Database;
			const boards = yield* Boards;
			const replay = yield* boards.mail(addressedMail());
			expect(replay.id).toBe(firstId);
			expect(yield* db.BoardEntry.all()).toHaveLength(1);
			const conflict = yield* Effect.flip(boards.mail({ ...addressedMail(), body: "different mail" }));
			expect(conflict._tag).toBe("BoardSourceConflict");
			expect(yield* db.BoardEntry.all()).toHaveLength(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("mail refuses an address whose Agent does not exist", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const boards = yield* Boards;
			expect((yield* Effect.flip(boards.mail(addressedMail("missing"))))._tag).toBe("BoardOwnerNotFound");
			expect((yield* Effect.flip(boards.unread("missing")))._tag).toBe("BoardOwnerNotFound");
			expect(yield* db.Board.all()).toEqual([]);
			expect(yield* db.BoardEntry.all()).toEqual([]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("an Agent cannot receipt mail addressed to another Agent", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const boards = yield* Boards;
			yield* createAgent("agent-port");
			yield* createAgent("agent-starboard");
			const theirs = yield* boards.mail(addressedMail("agent-starboard"));
			const refusal = yield* Effect.flip(boards.markRead("agent-port", [theirs.id]));
			expect(refusal._tag).toBe("MailNotAddressed");
			expect(yield* boards.unread("agent-starboard")).toHaveLength(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
