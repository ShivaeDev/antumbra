import { Database } from "@antumbra/persistence";
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
import { eventually, openReefVoyage } from "#test/voyage-fixtures.ts";

const FLAGSHIP_ID = "voyage-flagship";

const FLEET_TOOLS = [
	"read_fleet",
	"open_voyage",
	"charter_piece_on_voyage",
	"proclaim_ruling",
];

const RULE = {
	answer: "no voyage dredges a channel it did not survey first",
	context:
		"Two voyages dredged channels off each other's soundings and both had to be resurveyed.",
	question: "May a voyage dredge a channel it has not surveyed?",
	tags: ["dredging"],
	urgency: "eventual",
};

const openFlagship = Effect.gen(function* () {
	const db = yield* Database;
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

const hailedCaptain = (scripted: ScriptedBackend, voyageId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const hailed = yield* domain.voyages.hail(voyageId);
		return yield* eventually(sessionFor(scripted, hailed.agentId));
	});

const toolNames = (session: ScriptedSession): ReadonlyArray<string> =>
	session.tools.map((tool) => tool.name);

const withFlagshipCaptain = <A, E>(
	body: (
		captain: ScriptedSession,
	) => Effect.Effect<
		A,
		E,
		AgentDomain | Context.Service.Identifier<typeof Database>
	>,
) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* openFlagship;
			yield* body(yield* hailedCaptain(scripted, FLAGSHIP_ID));
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	});

it.live("the flagship's captain holds the fleet acts and a captain's own", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* openFlagship;
			const reef = yield* openReefVoyage;
			const flagship = yield* hailedCaptain(scripted, FLAGSHIP_ID);
			const captain = yield* hailedCaptain(scripted, reef.id);

			expect(toolNames(flagship)).toEqual(
				expect.arrayContaining([
					...FLEET_TOOLS,
					"charter_piece",
					"read_voyage",
				]),
			);
			for (const name of FLEET_TOOLS) {
				expect(toolNames(captain)).not.toContain(name);
			}
			expect(toolNames(captain)).toContain("charter_piece");
			// why: the ladder's first rung is a voyage's own captain, so ruling and
			// passing a question up are a captain's acts; the flagship holds them by
			// being a captain too rather than by being the fleet's.
			expect(toolNames(captain)).toEqual(
				expect.arrayContaining(["rule_on", "pass_up", "reclassify_ruling"]),
			);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("the flagship's captain reads every voyage in the fleet", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const reef = yield* openReefVoyage;
			const sounding = yield* domain.voyages.charterPiece({
				charter: "sound the eastern shoal",
				dependsOn: [],
				expectation: "the shoal is sounded",
				role: "hand",
				title: "sounding",
				voyageId: reef.id,
			});
			yield* domain.voyages.charterPiece({
				charter: "draw the eastern shoal",
				dependsOn: [sounding.id],
				expectation: "the shoal is drawn",
				role: "hand",
				title: "drawing",
				voyageId: reef.id,
			});
			const flagship = Option.getOrThrow(
				(yield* domain.voyages.read(FLAGSHIP_ID)).pipe(
					Option.flatMap((view) => view.captain),
				),
			);

			const read = yield* callTool(captain, "read_fleet", {});

			expect(read.ok).toBe(true);
			expect(read.text).toContain(`- ${FLAGSHIP_ID} Flagship [`);
			expect(read.text).toContain(
				`flagship · scripted · 0 pieces (0 unlaunched, 0 parked, 0 landed) · captain ${flagship.agentId} [alive] · last stirred 20`,
			);
			expect(read.text).toContain(
				`- ${reef.id} Chart the reef [quiet] · voyage · scripted · 2 pieces (2 unlaunched, 0 parked, 0 landed) · captain none · never stirred\n  north star: every shoal is known`,
			);
		}),
	),
);

it.live("the flagship's captain opens a voyage on the fleet's default", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const db = yield* Database;

			const outcome = yield* callTool(captain, "open_voyage", {
				context: "the shoals are unnamed",
				name: "Name the shoals",
				northStar: "every shoal has a name",
			});

			const opened = (yield* db.Voyage.where({
				name: "Name the shoals",
			}).all())[0];
			expect(outcome).toEqual({
				ok: true,
				text: `opened voyage ${opened?.id}`,
			});
			expect(opened).toMatchObject({
				backend: "claude",
				kind: "voyage",
				northStar: "every shoal has a name",
			});
		}),
	),
);

it.live("a voyage asked for without a north star is refused, not opened", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const db = yield* Database;

			const refusal = yield* callTool(captain, "open_voyage", {
				context: "the shoals are unnamed",
				name: "Name the shoals",
			});

			expect(refusal.ok).toBe(false);
			expect(refusal.text).toContain("open_voyage");
			expect(yield* db.Voyage.where({ name: "Name the shoals" }).all()).toEqual(
				[],
			);
		}),
	),
);

it.live("the flagship's captain charters a piece on a voyage it names", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const reef = yield* openReefVoyage;

			const outcome = yield* callTool(captain, "charter_piece_on_voyage", {
				charter: "sound the eastern shoal",
				expectation: "the shoal is sounded",
				role: "hand",
				title: "eastern",
				voyageId: reef.id,
			});

			const view = Option.getOrThrow(yield* domain.voyages.read(reef.id));
			const piece = view.pieces[0];
			expect(outcome).toEqual({
				ok: true,
				text: `chartered ${piece?.id} on voyage ${reef.id}`,
			});
			expect(piece).toMatchObject({ state: "held", title: "eastern" });
		}),
	),
);

it.live(
	"a piece chartered onto a voyage the fleet has not got is refused",
	() =>
		withFlagshipCaptain((captain) =>
			Effect.gen(function* () {
				const db = yield* Database;

				const refusal = yield* callTool(captain, "charter_piece_on_voyage", {
					charter: "sound the eastern shoal",
					expectation: "the shoal is sounded",
					role: "hand",
					title: "eastern",
					voyageId: "voyage-adrift",
				});

				expect(refusal.ok).toBe(false);
				expect(refusal.text).toContain("charter_piece_on_voyage");
				expect(yield* db.Piece.all()).toEqual([]);
			}),
		),
);

it.live("a rule the flagship proclaims stands for the fleet at once", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const db = yield* Database;

			const outcome = yield* callTool(captain, "proclaim_ruling", RULE);

			const stored = (yield* db.Ruling.all())[0];
			expect(outcome).toEqual({
				ok: true,
				text: `ruling ${stored?.id} proclaimed by the flagship — it binds the whole fleet until the admiral supersedes it`,
			});
			expect(stored).toMatchObject({
				question: RULE.question,
				radius: "fleet",
				requesterAgentId: null,
				requesterAuthority: "flagship",
				ruledBy: "flagship",
				urgency: "eventual",
			});
			expect(
				(yield* db.RulingSubject.all()).map((row) => [row.kind, row.tag]),
			).toEqual([["tag", "dredging"]]);
			const standing = yield* callTool(captain, "read_rulings", {});
			expect(standing.text).toContain("proclaimed by the flagship");
			expect(standing.text).toContain("ruled by the flagship");
		}),
	),
);

it.live(
	"a proclamation whose urgency is not a word the fleet knows is refused",
	() =>
		withFlagshipCaptain((captain) =>
			Effect.gen(function* () {
				const db = yield* Database;

				const refusal = yield* callTool(captain, "proclaim_ruling", {
					...RULE,
					urgency: "someday",
				});

				expect(refusal.ok).toBe(false);
				expect(refusal.text).toContain("proclaim_ruling");
				expect(yield* db.Ruling.all()).toEqual([]);
			}),
		),
);
