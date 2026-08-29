import { Database } from "@antumbra/persistence";
import { type Ruling, Rulings } from "@antumbra/rulings";
import { expect, it } from "@effect/vitest";
import { type Context, Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	makeScriptedBackend,
	type ScriptedBackend,
	type ScriptedSession,
	sessionFor,
} from "#test/harness.ts";
import { eventually } from "#test/voyage-fixtures.ts";

const ASKER = "agent-asker";
const FLAGSHIP_ID = "voyage-flagship";

const seedFlagship = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Agent.create({
		charter: "sound the shallows",
		id: ASKER,
		role: "hand",
		status: "alive",
	});
	yield* db.Voyage.create({
		backend: "scripted",
		context: "Fleet-level rulings and findings belong here.",
		focusedAt: null,
		id: FLAGSHIP_ID,
		kind: "flagship",
		name: "Flagship",
		northStar: "The fleet sails well.",
	});
});

const ask = (radius: "fleet" | "voyage") =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		return yield* rulings.request({
			choices: [{ label: "resurvey" }, { label: "trust the chart" }],
			context: "two voyages dredged each other's soundings",
			gates: [],
			question: "may a voyage dredge what it has not surveyed?",
			radius,
			requester: { agentId: ASKER, kind: "agent" },
			subjects: [],
			urgency: "pressing",
		});
	});

const hailedCaptain = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const hailed = yield* domain.voyages.hail(FLAGSHIP_ID);
		return yield* eventually(sessionFor(scripted, hailed.agentId));
	});

const withFlagshipCaptain = <A, E>(
	body: (
		captain: ScriptedSession,
	) => Effect.Effect<
		A,
		E,
		| AgentDomain
		| Context.Service.Identifier<typeof Database>
		| Context.Service.Identifier<typeof Rulings>
	>,
) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* seedFlagship;
			yield* body(yield* hailedCaptain(scripted));
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	});

const standing = (rulingId: string) =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		return yield* rulings.get(rulingId);
	});

const unruled = (ruling: Ruling) => Option.isNone(ruling.answer);

it.live("the flagship captain settles a request that binds the fleet", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const asked = yield* ask("fleet");

			const outcome = yield* callTool(captain, "rule_on", {
				answer: "no voyage dredges a channel it did not survey first",
				choice: "resurvey",
				rulingId: asked.id,
			});

			expect(outcome).toEqual({
				ok: true,
				text: `ruling ${asked.id} ruled by the flagship — it binds the whole fleet until the admiral supersedes it, and the answer reaches the asker as mail`,
			});
			const answer = Option.getOrThrow((yield* standing(asked.id)).answer);
			expect(answer.by).toBe("flagship");
			expect(answer.text).toBe(
				"no voyage dredges a channel it did not survey first",
			);
			expect(answer.choiceId).toEqual(Option.some(asked.choices[0]?.id));
		}),
	),
);

it.live("free words stand on their own when no choice is named", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const asked = yield* ask("fleet");

			const outcome = yield* callTool(captain, "rule_on", {
				answer: "neither; sound it again",
				rulingId: asked.id,
			});

			expect(outcome.ok).toBe(true);
			const answer = Option.getOrThrow((yield* standing(asked.id)).answer);
			expect(Option.isNone(answer.choiceId)).toBe(true);
		}),
	),
);

it.live("a request that binds one voyage is refused as another's to rule", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const asked = yield* ask("voyage");

			const refusal = yield* callTool(captain, "rule_on", {
				answer: "resurvey it",
				rulingId: asked.id,
			});

			expect(refusal).toEqual({
				ok: false,
				text: `ruling ${asked.id} binds one voyage, not the fleet — it is that voyage's captain's to rule on, and until captains sit on the ladder it waits for the admiral`,
			});
			expect(unruled(yield* standing(asked.id))).toBe(true);
		}),
	),
);

it.live("a ruling that already stands is not answered twice", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const rulings = yield* Rulings;
			const asked = yield* ask("fleet");
			yield* rulings.rule({
				answer: "survey first, always",
				by: "admiral",
				rulingId: asked.id,
			});

			const refusal = yield* callTool(captain, "rule_on", {
				answer: "on reflection, dredge away",
				rulingId: asked.id,
			});

			expect(refusal).toEqual({
				ok: false,
				text: `ruling ${asked.id} was already ruled by the admiral — a ruling that stands is superseded, never answered twice`,
			});
			expect(Option.getOrThrow((yield* standing(asked.id)).answer).text).toBe(
				"survey first, always",
			);
		}),
	),
);

it.live("a choice the asker never offered is refused with what was", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const asked = yield* ask("fleet");

			const refusal = yield* callTool(captain, "rule_on", {
				answer: "dredge it",
				choice: "dredge anyway",
				rulingId: asked.id,
			});

			expect(refusal).toEqual({
				ok: false,
				text: `ruling ${asked.id} never offered the choice "dredge anyway" — it offered "resurvey", "trust the chart"`,
			});
			expect(unruled(yield* standing(asked.id))).toBe(true);
		}),
	),
);

it.live("a ruling the fleet has not got is refused, not invented", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const refusal = yield* callTool(captain, "rule_on", {
				answer: "yes",
				rulingId: "ruling-adrift",
			});

			expect(refusal).toEqual({
				ok: false,
				text: "there is no ruling ruling-adrift — name it as your mail does",
			});
		}),
	),
);
