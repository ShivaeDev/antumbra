import type { AppDefinition } from "@antumbra/platform-feature/app.ts";
import type { RowShape } from "@antumbra/platform-feature/row.ts";
import { Context } from "effect";
export class LegacyModel extends Context.Service<LegacyModel, { readonly rows: readonly RowShape[] }>()("@antumbra/legacy-fixture/v1/Model") {}
export const legacyModel = (definition: AppDefinition) => ({
	rows: [...new Map(definition.features.flatMap((feature) => feature.rows).map((row) => [row.name, row])).values()],
});
