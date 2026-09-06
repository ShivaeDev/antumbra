import { incompleteException, sanctionedOf } from "#boundaries/exceptions.ts";
import type { BoundaryPolicyInventory, BoundaryRule, ImportSource, LocatePackage } from "#boundaries/model.ts";
import { failPolicy } from "#boundaries/validation.ts";

const validateNamed = (kind: "application" | "package", names: readonly string[], inventory: BoundaryPolicyInventory, location: string) => {
	if (names.length === 0) {
		failPolicy(`Boundary ${location} names no ${kind} units`);
	}
	const known = kind === "application" ? inventory.applications : inventory.packages.map(({ name }) => name);
	for (const name of names) {
		if (!known.includes(name)) {
			failPolicy(`Boundary ${location} names unknown ${kind} ${name}`);
		}
	}
};

const validateFamily = (family: string, inventory: BoundaryPolicyInventory, location: string) => {
	if (family.trim().length === 0 || !inventory.packages.some(({ name }) => name.startsWith(`${family}-`))) {
		failPolicy(`Boundary ${location} family ${family || "<empty>"} matches no packages`);
	}
};

const validateWorkspaceExcept = (
	selector: Extract<ImportSource, { readonly kind: "workspace-except" }>,
	inventory: BoundaryPolicyInventory,
	location: string,
) => {
	validateNamed("package", selector.excludedPackages, inventory, location);
	for (const exception of selector.sanctioned) {
		if (exception.package.trim().length > 0 && !inventory.packages.some(({ name }) => name === exception.package)) {
			failPolicy(`Boundary ${location} names unknown package ${exception.package}`);
		}
	}
};

const validateSelector = (selector: ImportSource, inventory: BoundaryPolicyInventory, location: string): void => {
	switch (selector.kind) {
		case "all-applications":
			if (inventory.applications.length === 0) {
				failPolicy(`Boundary ${location} selects no applications`);
			}
			return;
		case "all-packages":
			if (inventory.packages.length === 0) {
				failPolicy(`Boundary ${location} selects no packages`);
			}
			return;
		case "any":
			if (selector.selectors.length === 0) {
				failPolicy(`Boundary ${location} has an empty category`);
			}
			for (const [index, member] of selector.selectors.entries()) {
				validateSelector(member, inventory, `${location}[${index}]`);
			}
			return;
		case "application":
		case "package":
			validateNamed(selector.kind, selector.names, inventory, location);
			return;
		case "package-family":
			validateFamily(selector.family, inventory, location);
			return;
		case "workspace-except":
			validateWorkspaceExcept(selector, inventory, location);
			return;
		case "external-module":
		case "external-namespace":
			if (selector.name.trim().length === 0) {
				failPolicy(`Boundary ${location} names an empty module`);
			}
			return;
	}
};

export const validatePolicyInventory = (policy: readonly BoundaryRule[], inventory: BoundaryPolicyInventory) => {
	for (const rule of policy) {
		for (const exception of sanctionedOf(rule)) {
			const failure = incompleteException(rule, exception);
			if (failure !== undefined) {
				failPolicy(failure);
			}
		}
		if (rule.kind === "negative-fence") {
			validateSelector(rule.from, inventory, `${rule.name}.from`);
			validateSelector(rule.to, inventory, `${rule.name}.to`);
			continue;
		}
		validateSelector(rule.consumers, inventory, `${rule.name}.consumers`);
		if (rule.allowedSubjects.length === 0) {
			failPolicy(`Boundary ${rule.name} allows no vocabulary subjects`);
		}
		for (const subject of rule.allowedSubjects) {
			if (!inventory.vocabularySubjects.includes(subject)) {
				failPolicy(`Boundary ${rule.name} names unknown vocabulary subject ${subject}`);
			}
		}
	}
};

export const locatePackage =
	(inventory: BoundaryPolicyInventory): LocatePackage =>
	(name) =>
		inventory.packages.find((location) => location.name === name)?.path ?? failPolicy(`Boundary policy names unknown package ${name}`);
