import { sourceComments } from "#lint/adapters/typescript.ts";
import type { Inventory, TextFile } from "#lint/inventory.ts";

export interface SeedFile {
	readonly content: string;
	readonly path: string;
}

export interface Seed {
	readonly documents?: readonly TextFile[];
	readonly manifests?: readonly TextFile[];
	readonly pragmaRegistry?: string;
	readonly root?: string;
	readonly serviceParameterAllowance?: string;
	readonly serviceParameterBaseline?: string;
	readonly sources?: readonly SeedFile[];
	readonly workspaceCatalog?: string;
}

export const inventoryOf = (seed: Seed): Inventory => ({
	documents: seed.documents ?? [],
	manifests: seed.manifests ?? [],
	pragmaRegistry: seed.pragmaRegistry ?? "[]",
	root: seed.root ?? "/virtual",
	serviceParameterAllowance: seed.serviceParameterAllowance ?? "[]",
	serviceParameterBaseline: seed.serviceParameterBaseline ?? "[]",
	sources: (seed.sources ?? []).map((file) => ({
		comments: sourceComments(file.path, file.content),
		lines: file.content.split("\n"),
		path: file.path,
	})),
	workspaceCatalog: seed.workspaceCatalog ?? "",
});
