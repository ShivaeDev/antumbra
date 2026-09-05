import { bind, standDownSpec } from "@antumbra/agent-tools";
import { SessionStandDown } from "@antumbra/sessions";
import { Effect } from "effect";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

export const makeStandDownTool = Effect.gen(function* () {
	const sessions = yield* SessionStandDown;
	return (identity: SessionIdentity) =>
		bind(standDownSpec, () => answered(identity, standDownSpec.name, sessions.standDown(identity), () => "standing by"));
});
