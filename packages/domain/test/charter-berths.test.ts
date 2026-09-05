import { Pieces } from "@antumbra/pieces";
import { Repos } from "@antumbra/repos";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { deliveredCharter } from "#test/charter-fixture.ts";
import { makeScriptedRunner } from "#test/harness.ts";
import { openReefVoyage } from "#test/voyage-fixtures.ts";

it.effectApp.withProviders(
	"a dispatched crew is told the moorage folder it was berthed in",
	makeScriptedRunner.pipe(Effect.map(({ runner }) => ({ providers: { runners: new Map([[runner.tag, runner]]) }, state: undefined }))),
	function* ({ scripted }) {
		const pieces = yield* Pieces;
		const repos = yield* Repos;
		yield* repos.register({
			defaultRef: "main",
			source: "/workspace/Desktop",
		});
		const reef = yield* openReefVoyage;
		const alpha = yield* pieces.charter({
			charter: "Investigate lost edits after restart.",
			dependsOn: [],
			expectation: "A report identifying the cause.",
			role: "hand",
			title: "Investigate lost edits",
			voyageId: reef.id,
		});
		yield* pieces.launch(alpha.id);

		const { agentId, text: charter } = yield* deliveredCharter(scripted, alpha.id);
		expect(charter).toContain(`/tmp/moorage/${agentId}`);
		expect(charter).toContain(`Desktop — ./berth-0 — branch work/${agentId.slice(0, 8)}/berth-0`);
	},
);
