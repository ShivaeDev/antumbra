export const KEY = "antumbra:opened-voyages:v1";

const KEPT = 5;

const stored = (): readonly string[] => {
	try {
		const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
		return Array.isArray(saved) ? saved.filter((value) => typeof value === "string") : [];
	} catch {
		return [];
	}
};

export const openedVoyages = (): readonly string[] => stored().slice(0, KEPT);

export const rememberOpenedVoyage = (voyageId: string): readonly string[] => {
	const opened = [voyageId, ...stored().filter((kept) => kept !== voyageId)].slice(0, KEPT);
	try {
		window.localStorage.setItem(KEY, JSON.stringify(opened));
	} catch {
		return opened;
	}
	return opened;
};
