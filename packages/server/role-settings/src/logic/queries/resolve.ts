import type { backendModel } from "@antumbra/domain-backends/rows/backend-model.ts";
import type * as Source from "@antumbra/domain-role-settings/queries/resolve.ts";
import type { roleSetting } from "@antumbra/domain-role-settings/rows/role-setting.ts";
import { AGENT_BACKEND_TAGS } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { type Inherited, InheritedSchema, type RoleSettingSource, RoleSettingSourceSchema } from "@antumbra/platform-vocabulary/role-setting.ts";
import { FLEET } from "@antumbra/platform-vocabulary/role-settings-ids.ts";
import { selection as backendModelSelection } from "@antumbra/server-storage/records/backend-model.ts";
import { selection as roleSettingSelection } from "@antumbra/server-storage/records/role-setting.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";

const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

const Named = Schema.Struct({ value: Schema.NullOr(Schema.String), source: RoleSettingSourceSchema });

export const Resolution = Schema.Struct({
	backend: Schema.Struct({ value: Schema.String, source: RoleSettingSourceSchema }),
	fallback: Schema.Struct({ value: Schema.String, source: InheritedSchema }),
	model: Named,
	effort: Named,
});
export type Resolution = typeof Resolution.Type;

export const UNCHOSEN = { backend: null, effort: null, model: null };

type Chosen = Pick<typeof roleSetting.Row.Type, "backend" | "effort" | "model">;
type Offered = typeof backendModel.Row.Type;

const inheritedSource = (inherited: string | null): Inherited => (inherited === null ? "backend" : "fleet");

const sourceOf = (chosen: string | null, inherited: string | null): RoleSettingSource => (chosen === null ? inheritedSource(inherited) : "chosen");

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
		fallback: { source: inheritedSource(standing.backend), value: fleetBackend },
		model,
	};
};

export const resolve = Effect.fn("roleSettings.resolve")(function* (
	input: Schema.Struct.Type<typeof Source.resolve.input>,
): Effect.fn.Return<typeof Source.resolve.output.Type, never, Records> {
	const rows = yield* Records;

	const stored = yield* rows.roleSetting
		.findMany({ where: { role: input.role }, orderBy: { field: "storage_order", direction: "asc" }, select: roleSettingSelection })
		.pipe(Effect.orDie);
	const catalogue = yield* rows.backendModel
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: backendModelSelection })
		.pipe(Effect.orDie);
	const chosenAt = (scope: string) => stored.find((candidate) => candidate.scope === scope) ?? UNCHOSEN;
	const standing = input.voyageId === null ? UNCHOSEN : chosenAt(FLEET);
	const chosen = chosenAt(input.voyageId ?? FLEET);
	return resolution(chosen, standing, catalogue);
});
