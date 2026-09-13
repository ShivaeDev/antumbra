import { backendModel } from "@antumbra/domain-backends/rows/backend-model.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { AGENT_BACKEND_TAGS } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { AgentRoleSchema } from "@antumbra/platform-vocabulary/agent-role.ts";
import { Effect, Schema } from "effect";
import { FLEET } from "#ids.ts";
import { roleSetting } from "#rows/role-setting.ts";

const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

export const SourceSchema = Schema.Literals(["chosen", "fleet", "backend"]);
export type Source = typeof SourceSchema.Type;

const Named = Schema.Struct({ value: Schema.NullOr(Schema.String), source: SourceSchema });

export const Resolution = Schema.Struct({
	backend: Schema.Struct({ value: Schema.String, source: SourceSchema }),
	model: Named,
	effort: Named,
});
export type Resolution = typeof Resolution.Type;

export const UNCHOSEN = { backend: null, effort: null, model: null };

const INHERITED = { backend: "backend default", fleet: "fleet default" };

export const inheritedFrom = (source: Source): string | undefined => (source === "chosen" ? undefined : INHERITED[source]);

type Chosen = Pick<typeof roleSetting.Row.Type, "backend" | "effort" | "model">;
type Offered = typeof backendModel.Row.Type;

const sourceOf = (chosen: string | null, inherited: string | null): Source => {
	if (chosen !== null) return "chosen";
	if (inherited !== null) return "fleet";
	return "backend";
};

const named = (chosen: string | null, inherited: string | null, declared: string | null): typeof Named.Type => ({
	source: sourceOf(chosen, inherited),
	value: chosen ?? inherited ?? declared,
});

export const resolution = (chosen: Chosen, standing: Chosen, catalogue: readonly Offered[]): Resolution => {
	const fleetBackend = standing.backend ?? FIRST_BACKEND;
	const backend = chosen.backend ?? fleetBackend;
	const inherited = backend === fleetBackend ? standing : UNCHOSEN;
	const offered = catalogue.filter((candidate) => candidate.backend === backend);
	const declared = offered.find((candidate) => candidate.isDefault);
	const model = named(chosen.model, inherited.model, declared?.model ?? null);
	const running = offered.find((candidate) => candidate.model === model.value);
	return {
		backend: { source: sourceOf(chosen.backend, standing.backend), value: backend },
		effort: named(chosen.effort, inherited.effort, running?.defaultEffort ?? null),
		model,
	};
};

export const resolve = query("resolve", {
	input: { voyageId: Schema.NullOr(Schema.String), role: AgentRoleSchema },
	output: Resolution,
	reads: [roleSetting, backendModel],
	run: Effect.fn("roleSettings.resolve")(function* (input, rows) {
		const stored = yield* rows.roleSetting.where({ role: input.role });
		const catalogue = yield* rows.backendModel.where({});
		const chosenAt = (scope: string) => stored.find((candidate) => candidate.scope === scope) ?? UNCHOSEN;
		const standing = input.voyageId === null ? UNCHOSEN : chosenAt(FLEET);
		const chosen = chosenAt(input.voyageId ?? FLEET);
		return resolution(chosen, standing, catalogue);
	}),
});
