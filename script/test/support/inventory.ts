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
	readonly sources?: readonly SeedFile[];
	readonly workspaceCatalog?: string;
}

const PACKAGE_ROOT = /^((?:apps|packages)\/.+?)\/(?:script|src|test)\//;

const derivedManifests = (sources: readonly SeedFile[]): readonly TextFile[] =>
	[...new Set(sources.flatMap((file) => PACKAGE_ROOT.exec(file.path)?.[1] ?? []))].map((root) => ({
		path: `${root}/package.json`,
		raw: JSON.stringify({ name: `@antumbra/${root.split("/").at(-1) ?? ""}` }),
	}));

export const inventoryOf = (seed: Seed): Inventory => ({
	documents: seed.documents ?? [],
	manifests: seed.manifests ?? derivedManifests(seed.sources ?? []),
	pragmaRegistry: seed.pragmaRegistry ?? "[]",
	root: seed.root ?? "/virtual",
	sources: (seed.sources ?? []).map((file) => ({
		comments: sourceComments(file.path, file.content),
		lines: file.content.split("\n"),
		path: file.path,
	})),
	workspaceCatalog: seed.workspaceCatalog ?? "",
});
