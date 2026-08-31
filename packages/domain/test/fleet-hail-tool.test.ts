import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { withFlagshipCaptain } from "#test/flagship-fixtures.ts";
import { callTool } from "#test/harness.ts";
import { aliveAgent, eventually, openReefVoyage } from "#test/voyage-fixtures.ts";

it.live("the flagship's captain hails a voyage's captain", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const reef = yield* openReefVoyage;

			const first = yield* callTool(captain, "hail_captain", {
				voyageId: reef.id,
			});

			expect(first.ok).toBe(true);
			const [, agentId = "", spawnIntentId = ""] = /^hailed captain (\S+) of voyage (?:\S+) — intent (\S+)$/.exec(first.text) ?? [];
			expect(first.text).toBe(`hailed captain ${agentId} of voyage ${reef.id} — intent ${spawnIntentId}`);
			expect(Option.getOrThrow(yield* db.Intent.where({ id: spawnIntentId }).first()).tag).toBe("agent/spawn");
			yield* eventually(aliveAgent(agentId));
			const view = Option.getOrThrow(yield* domain.voyages.read(reef.id));
			expect(Option.getOrThrow(view.captain)).toMatchObject({
				agentId,
				status: "alive",
			});
		}),
	),
);
