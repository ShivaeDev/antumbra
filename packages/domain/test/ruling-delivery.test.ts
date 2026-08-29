import { BoardScope, Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Rulings } from "@antumbra/rulings";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import {
	domainCapabilityLayer,
	domainKernelLayer,
} from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
} from "#test/harness.ts";
import { eventually } from "#test/voyage-fixtures.ts";

const ASKER = "agent-asker";

const seedAsker = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Agent.create({
		charter: "sound the shallows",
		id: ASKER,
		role: "hand",
		status: "alive",
	});
});

const askedAndRuled = (question: string, answer: string) =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		const requested = yield* rulings.request({
			choices: [{ label: "resurvey" }],
			context: "the chart disagrees with what we sounded",
			gates: [],
			question,
			radius: "voyage",
			requester: { agentId: ASKER, kind: "agent" },
			subjects: [],
			urgency: "pressing",
		});
		const picked = requested.choices[0];
		yield* rulings.rule({
			answer,
			by: "admiral",
			choiceId: picked?.id ?? "",
			rulingId: requested.id,
		});
		return requested.id;
	});

const mailbox = Effect.gen(function* () {
	const boards = yield* Boards;
	return yield* boards.read(BoardScope.Agent({ agentId: ASKER }));
});

const deliveredMail = (count: number) =>
	eventually(
		Effect.gen(function* () {
			const entries = yield* mailbox;
			expect(entries).toHaveLength(count);
			return entries;
		}),
	);

it.live("an answer reaches its asker as one priority mail", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* seedAsker;
			const rulingId = yield* askedAndRuled(
				"which reading do we trust?",
				"the chart is older than the reef; resurvey it",
			);

			const entries = yield* deliveredMail(1);

			expect(entries[0]).toMatchObject({
				authorAgentId: null,
				kind: "mail",
				precedence: "priority",
				sourceRef: `ruling:${rulingId}`,
			});
			expect(entries[0]?.body).toBe(
				[
					"You asked: which reading do we trust?",
					"Answer: the chart is older than the reef; resurvey it",
					"Chosen: resurvey",
					`Ruled by the admiral at ${Option.getOrThrow(
						(yield* (yield* Rulings).get(rulingId)).answer,
					).at.toISOString()}.`,
					`Ruling ${rulingId}.`,
				].join("\n"),
			);
			const row = Option.getOrThrow(
				yield* db.Ruling.where({ id: rulingId }).first(),
			);
			expect(row.deliveredAt).toBeInstanceOf(Date);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live(
	"a later pass delivers the next answer and repeats no earlier one",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const feeds = yield* DomainFeeds;
				yield* seedAsker;
				const first = yield* askedAndRuled("which reading?", "resurvey it");
				yield* deliveredMail(1);

				// why: a bare ring makes the observer walk the record again with
				// nothing new in it, so the second answer proves the pass ran and the
				// single entry per ruling proves the first was not sent twice.
				yield* feeds.publishRulingRefresh();
				const second = yield* askedAndRuled(
					"and the northern shoal?",
					"sound it",
				);

				const entries = yield* deliveredMail(2);
				expect(entries.map((entry) => entry.sourceRef)).toEqual([
					`ruling:${first}`,
					`ruling:${second}`,
				]);
			}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
		}),
);

it.live("an answer ruled while nothing observed is delivered on start", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const rulingId = yield* Effect.gen(function* () {
			yield* seedAsker;
			const ruled = yield* askedAndRuled("which reading?", "resurvey it");
			expect(yield* mailbox).toEqual([]);
			return ruled;
		}).pipe(Effect.provide(domainCapabilityLayer(temporary)));

		yield* Effect.gen(function* () {
			const entries = yield* deliveredMail(1);
			expect(entries[0]?.sourceRef).toBe(`ruling:${rulingId}`);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
