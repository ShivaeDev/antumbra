import { bind, readRulingsSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { type Ruling, Rulings } from "@antumbra/rulings";
import { Effect } from "effect";
import { rulingBlock, standingRulingsFor } from "#standing-rulings.ts";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

const rendered = (standing: ReadonlyArray<Ruling>): string =>
	standing.length === 0 ? "no standing rulings bind you" : standing.map(rulingBlock).join("\n\n");

export const makeRulingReadingToolCompiler = Effect.gen(function* () {
	const rulings = yield* Rulings;
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(readRulingsSpec, (input) =>
			answered(identity, readRulingsSpec.name, standingRulingsFor(identity, input.tags).pipe(Effect.provideService(Rulings, rulings)), rendered),
		),
	];
});
