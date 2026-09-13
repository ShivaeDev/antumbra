import { expect, it } from "@effect/vitest";
import { type TypecheckPackage, typecheckGroups } from "#typecheck/groups.ts";

it("distributes packages with shared application dependencies across the groups", () => {
	const packages: readonly TypecheckPackage[] = [
		{ name: "app", bytes: 1_000, dependencies: ["first"], checks: false },
		{ name: "first", bytes: 1, dependencies: ["app"], checks: true },
		{ name: "second", bytes: 1, dependencies: ["app"], checks: true },
		{ name: "third", bytes: 1, dependencies: ["app"], checks: true },
		{ name: "small", bytes: 10, dependencies: [], checks: true },
	];
	const groups = typecheckGroups(packages, 3);
	expect(groups.flat().toSorted()).toEqual(["first", "second", "small", "third"]);
	for (const group of groups) {
		expect(group.filter((name) => name !== "small")).toHaveLength(1);
	}
	expect(typecheckGroups(packages.toReversed(), 3)).toEqual(groups);
	const added = typecheckGroups([...packages, { name: "new", bytes: 15, dependencies: [], checks: true }], 3);
	expect(added.flat().toSorted()).toEqual(["first", "new", "second", "small", "third"]);
});
