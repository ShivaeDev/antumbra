import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { withFlagshipCaptain } from "#test/flagship-fixtures.ts";
import { callTool } from "#test/harness.ts";
import {
	aliveAgent,
	eventually,
	openReefVoyage,
	seedSpawningCaptain,
} from "#test/voyage-fixtures.ts";

it.live(
	"the flagship's captain hails a voyage's captain, then reaches it",
	() =>
		withFlagshipCaptain((captain) =>
			Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const reef = yield* openReefVoyage;

				const first = yield* callTool(captain, "hail_captain", {
					voyageId: reef.id,
				});

				expect(first.ok).toBe(true);
				const [, agentId = "", spawnIntentId = ""] =
					/^hailed captain (\S+) of voyage (?:\S+) — intent (\S+)$/.exec(
						first.text,
					) ?? [];
				expect(first.text).toBe(
					`hailed captain ${agentId} of voyage ${reef.id} — intent ${spawnIntentId}`,
				);
				expect(
					Option.getOrThrow(
						yield* db.Intent.where({ id: spawnIntentId }).first(),
					).tag,
				).toBe("agent/spawn");
				yield* eventually(aliveAgent(agentId));
				const view = Option.getOrThrow(yield* domain.voyages.read(reef.id));
				expect(Option.getOrThrow(view.captain)).toMatchObject({
					agentId,
					status: "alive",
				});

				const again = yield* callTool(captain, "hail_captain", {
					voyageId: reef.id,
				});

				expect(again.ok).toBe(true);
				expect(again.text).toContain(
					`hailed captain ${agentId} of voyage ${reef.id} — intent `,
				);
				expect(
					(yield* db.Intent.where({ tag: "agent/wake" }).all()).map(
						(intent) => `intent ${intent.id}`,
					),
				).toContainEqual(again.text.slice(again.text.indexOf("intent ")));
				expect(
					yield* db.VoyageAgent.where({ voyageId: reef.id }).all(),
				).toHaveLength(1);
			}),
		),
);

it.live("a hail is refused while the voyage's captain is being born", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const db = yield* Database;
			const reef = yield* openReefVoyage;
			yield* seedSpawningCaptain(reef.id);

			const refusal = yield* callTool(captain, "hail_captain", {
				voyageId: reef.id,
			});

			expect(refusal).toEqual({
				ok: false,
				text: `hail_captain: CaptainAlreadyHailed: voyage ${reef.id} already has captain captain-newborn at work`,
			});
			expect(yield* db.Agent.where({ role: "captain" }).all()).toHaveLength(2);
		}),
	),
);

it.live("a hail for a voyage the fleet has not got is refused", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const db = yield* Database;

			const refusal = yield* callTool(captain, "hail_captain", {
				voyageId: "voyage-adrift",
			});

			expect(refusal).toEqual({
				ok: false,
				text: "hail_captain: VoyageNotFound: voyage voyage-adrift is not in the fleet",
			});
			expect(yield* db.Intent.where({ tag: "agent/spawn" }).all()).toHaveLength(
				1,
			);
		}),
	),
);
