import type {
	BoundaryRule,
	FixtureEdge,
	FixtureEndpoint,
	ImportSource,
	ImportTarget,
	RuleExamples,
	WorkspaceFixtureEndpoint,
	WorkspaceRoot,
} from "#boundaries/model.ts";

const named = (kind: "application" | "package", names: readonly string[]) =>
	({
		kind,
		names,
	}) satisfies ImportTarget;

export const applications = {
	all: { kind: "all-applications" } satisfies ImportTarget,
	named: (...names: readonly string[]): ImportTarget =>
		named("application", names),
};

export const packages = {
	all: { kind: "all-packages" } satisfies ImportTarget,
	inFamily: (family: string): ImportTarget => ({
		family,
		kind: "package-family",
	}),
	named: (...names: readonly string[]): ImportTarget => named("package", names),
};

export const modules = {
	named: (name: string): ImportTarget => ({
		kind: "external-module",
		name,
	}),
	under: (name: string): ImportTarget => ({
		kind: "external-namespace",
		name,
	}),
};

export const anyOf = (...selectors: readonly ImportTarget[]): ImportTarget => ({
	kind: "any",
	selectors,
});

export const workspaceExcept = (
	...excludedPackages: readonly string[]
): ImportSource => ({
	excludedPackages,
	kind: "workspace-except",
});

const workspaceFile = (
	root: WorkspaceRoot,
	name: string,
	path: string,
): WorkspaceFixtureEndpoint => ({
	kind: "workspace-file",
	path: `${root}/${name}/${path}`,
});

export const files = {
	inApplication: (name: string, path: string): WorkspaceFixtureEndpoint =>
		workspaceFile("apps", name, path),
	inPackage: (name: string, path: string): WorkspaceFixtureEndpoint =>
		workspaceFile("packages", name, path),
	module: (name: string): FixtureEndpoint => ({
		kind: "external-module",
		name,
	}),
};

export const importFrom = (from: WorkspaceFixtureEndpoint) => ({
	to: (to: FixtureEndpoint): FixtureEdge => ({ from, to }),
});

export const fence = (name: string) => ({
	because: (rationale: string) => ({
		forbidsImportsFrom: (from: ImportSource) => ({
			to: (to: ImportTarget) => ({
				demonstratedBy: (examples: RuleExamples): BoundaryRule => ({
					examples,
					from,
					kind: "negative-fence",
					name,
					rationale,
					to,
				}),
			}),
		}),
	}),
});

export const vocabularyAccess = (name: string) => ({
	because: (rationale: string) => ({
		for: (consumers: ImportSource) => ({
			allowsOnly: (...allowedSubjects: readonly string[]) => ({
				demonstratedBy: (examples: RuleExamples): BoundaryRule => ({
					allowedSubjects,
					consumers,
					examples,
					kind: "vocabulary-access",
					name,
					rationale,
				}),
			}),
		}),
	}),
});
