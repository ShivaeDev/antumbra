import { Database, Writer } from "@antumbra/persistence";
import { corruptTestBoardEntry } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
} from "#test/harness.ts";

const AGENT_ID = "agent-mailbox";

const createAgent = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			db.Agent.create({
				charter: "take in addressed mail",
				id: agentId,
				role: "hand",
				status: "alive",
			}),
		);
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
			const domain = yield* AgentDomain;
			yield* createAgent(AGENT_ID);
			return (yield* domain.boards.mail(addressedMail())).id;
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));

		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const first = yield* domain.boards.unread(AGENT_ID);
			const second = yield* domain.boards.unread(AGENT_ID);
			expect(first.map((entry) => entry.id)).toEqual([entryId]);
			expect(second.map((entry) => entry.id)).toEqual([entryId]);
			yield* domain.boards.markRead(AGENT_ID, [entryId]);
			expect(
				(yield* domain.boards.read({ agentId: AGENT_ID, kind: "agent" }))
					.length,
			).toBe(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));

		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			expect(yield* domain.boards.unread(AGENT_ID)).toEqual([]);
			expect(
				(yield* domain.boards.read({ agentId: AGENT_ID, kind: "agent" })).map(
					(entry) => entry.id,
				),
			).toEqual([entryId]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("a stable source reference makes replay idempotent", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const firstId = yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			yield* createAgent(AGENT_ID);
			return (yield* domain.boards.mail(addressedMail())).id;
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));

		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const replay = yield* domain.boards.mail(addressedMail());
			expect(replay.id).toBe(firstId);
			expect(yield* db.BoardEntry.all()).toHaveLength(1);
			const conflict = yield* Effect.flip(
				domain.boards.mail({ ...addressedMail(), body: "different mail" }),
			);
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
			const domain = yield* AgentDomain;
			expect(
				(yield* Effect.flip(domain.boards.mail(addressedMail("missing"))))._tag,
			).toBe("BoardOwnerNotFound");
			expect((yield* Effect.flip(domain.boards.unread("missing")))._tag).toBe(
				"BoardOwnerNotFound",
			);
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
			const domain = yield* AgentDomain;
			yield* createAgent("agent-port");
			yield* createAgent("agent-starboard");
			const theirs = yield* domain.boards.mail(
				addressedMail("agent-starboard"),
			);
			const refusal = yield* Effect.flip(
				domain.boards.markRead("agent-port", [theirs.id]),
			);
			expect(refusal._tag).toBe("MailNotAddressed");
			expect(yield* domain.boards.unread("agent-starboard")).toHaveLength(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("concurrent receipt replay writes one durable receipt", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			yield* createAgent(AGENT_ID);
			const entry = yield* domain.boards.mail(addressedMail());
			yield* Effect.all(
				[
					domain.boards.markRead(AGENT_ID, [entry.id]),
					domain.boards.markRead(AGENT_ID, [entry.id]),
				],
				{ concurrency: "unbounded" },
			);
			expect(yield* db.BoardEntryReceipt.all()).toHaveLength(1);
			expect(yield* domain.boards.unread(AGENT_ID)).toEqual([]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

for (const corruption of [
	{ column: "kind", value: "alarm" },
	{ column: "precedence", value: "urgent" },
	{ column: "register", value: "archive" },
] as const) {
	it.live(`stored ${corruption.column} corruption fails closed`, () =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const domain = yield* AgentDomain;
				yield* createAgent(AGENT_ID);
				yield* domain.boards.mail(addressedMail());
			}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
			yield* Effect.sync(() =>
				corruptTestBoardEntry(
					temporary.database,
					corruption.column,
					corruption.value,
				),
			);
			yield* Effect.gen(function* () {
				const domain = yield* AgentDomain;
				const failure = yield* Effect.flip(domain.boards.unread(AGENT_ID));
				expect(failure._tag).toBe("StoredBoardEntryInvalid");
			}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
		}),
	);
}
