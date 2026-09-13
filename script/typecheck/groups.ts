export interface TypecheckPackage {
	readonly name: string;
	readonly bytes: number;
	readonly dependencies: readonly string[];
	readonly checks: boolean;
}

export const typecheckGroups = (packages: readonly TypecheckPackage[], count: number): readonly (readonly string[])[] => {
	const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
	const weight = (name: string, visited = new Set<string>()): number => {
		const pkg = byName.get(name);
		if (pkg === undefined || visited.has(name)) return 0;
		visited.add(name);
		return pkg.bytes + pkg.dependencies.reduce((total, dependency) => total + weight(dependency, visited), 0);
	};
	const weighted = packages
		.filter((pkg) => pkg.checks)
		.map((pkg) => ({ name: pkg.name, bytes: weight(pkg.name) }))
		.toSorted((left, right) => right.bytes - left.bytes || left.name.localeCompare(right.name));
	const groups: { bytes: number; names: string[] }[] = Array.from({ length: count }, () => ({ bytes: 0, names: [] }));
	for (const pkg of weighted) {
		const group = groups.reduce((lightest, candidate) => (candidate.bytes < lightest.bytes ? candidate : lightest));
		group.names.push(pkg.name);
		group.bytes += pkg.bytes;
	}
	return groups.map((group) => group.names);
};
