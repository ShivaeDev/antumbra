export type LayoutGroup = "app" | "glass" | "old" | "platform" | "runner" | "server";

export interface Placement {
	readonly group: LayoutGroup;
	readonly role: string;
}

export interface Allowance {
	readonly allowed: string;
	readonly group: string;
}

const DOMAIN_FILES = "and a server domain's files";

const PROCESS_ROLES: Readonly<Record<string, readonly string[]>> = {
	runner: ["backends", "fabric", "git", "ports", "tools"],
	server: ["domains", "edges", "journal"],
};

const RESTRICTED_ROLES: ReadonlySet<string> = new Set(["edges", "git", "journal", "ports"]);

const roleUnder = (group: string, segments: readonly string[]): string => {
	const first = segments[0] ?? "";
	return (PROCESS_ROLES[group] ?? []).includes(first) ? first : "";
};

export const placementOf = (root: string): Placement => {
	const [area, ...rest] = root.split("/");
	if (area === "apps") {
		return { group: "app", role: "" };
	}
	const [nest, ...deeper] = rest;
	if (nest === "platform" || nest === "glass") {
		return { group: nest, role: "" };
	}
	if (nest === "server" || nest === "runner") {
		return { group: nest, role: roleUnder(nest, deeper) };
	}
	return { group: "old", role: "" };
};

const withinGroup = (from: Placement, to: Placement): boolean => {
	if (from.role === "backends") {
		return to.role === "ports";
	}
	return !RESTRICTED_ROLES.has(from.role);
};

export const mayImport = (from: Placement, to: Placement): boolean => {
	if (from.group === "app" || to.group === "platform") {
		return true;
	}
	if (from.group === "platform") {
		return false;
	}
	if (from.group === "old") {
		return to.group === "old";
	}
	if (to.group === "old") {
		return false;
	}
	if (from.group === to.group) {
		return withinGroup(from, to);
	}
	return from.group === "glass" && to.group === "server" && to.role === "domains";
};

const roleLabel = ({ group, role }: Placement): string => `${group} ${role === "edges" ? "edge" : role}`;

export const allowanceOf = (placement: Placement): Allowance => {
	if (placement.group === "app") {
		return { allowed: "anything", group: "app" };
	}
	if (placement.group === "platform") {
		return { allowed: "platform", group: "platform" };
	}
	if (placement.group === "old") {
		return { allowed: "old and platform", group: "old" };
	}
	if (placement.group === "glass") {
		return { allowed: `platform, glass, ${DOMAIN_FILES}`, group: "glass" };
	}
	if (placement.role === "backends") {
		return { allowed: "platform and the runner's ports", group: "runner backend" };
	}
	if (RESTRICTED_ROLES.has(placement.role)) {
		return { allowed: "platform", group: roleLabel(placement) };
	}
	return { allowed: `platform and ${placement.group}`, group: placement.group };
};
