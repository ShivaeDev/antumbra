import { query } from "@antumbra/platform-feature/query.ts";
import { AGENT_BACKEND_TAGS } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { AgentRoleSchema } from "@antumbra/platform-vocabulary/agent-role.ts";
import { Effect, Schema } from "effect";
import { FLEET } from "#ids.ts";
import { roleSetting } from "#rows/role-setting.ts";

const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

const UNCHOSEN = { backend: null, effort: null, model: null };

export const resolve = query("resolve", {
	input: { voyageId: Schema.NullOr(Schema.String), role: AgentRoleSchema },
	output: Schema.Struct({ backend: Schema.String, model: Schema.NullOr(Schema.String), effort: Schema.NullOr(Schema.String) }),
	reads: [roleSetting],
	run: Effect.fn("roleSettings.resolve")(function* (input, rows) {
		const stored = yield* rows.roleSetting.where({ role: input.role });
		const chosenAt = (scope: string) => stored.find((candidate) => candidate.scope === scope) ?? UNCHOSEN;
		const standing = chosenAt(FLEET);
		const override = input.voyageId === null ? UNCHOSEN : chosenAt(input.voyageId);
		const sailsOn = standing.backend ?? FIRST_BACKEND;
		const backend = override.backend ?? sailsOn;
		const inherited = backend === sailsOn ? standing : UNCHOSEN;
		return { backend, effort: override.effort ?? inherited.effort, model: override.model ?? inherited.model };
	}),
});
