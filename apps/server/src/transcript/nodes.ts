export const UNNAMED_SUBSESSION = "Unnamed subsession";

const pathLeaf = (kind: string): string | undefined => {
	if (!kind.includes("/")) {
		return undefined;
	}
	const leaf = kind.slice(kind.lastIndexOf("/") + 1);
	const stem = leaf.includes(".") ? leaf.slice(0, leaf.lastIndexOf(".")) : leaf;
	return stem === "" ? undefined : stem;
};

export const subsessionDisplayName = (stored: { readonly kind: string | null; readonly label: string | null }): string => {
	if (stored.label !== null && stored.label !== "") {
		return stored.label;
	}
	if (stored.kind === null || stored.kind === "") {
		return UNNAMED_SUBSESSION;
	}
	return pathLeaf(stored.kind) ?? stored.kind;
};
