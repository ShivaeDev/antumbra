// why: one page pointing the console at another is one update — the mode and
// the selection its page reads arrive together, so no render shows the new
// page against the old selection. A target names exactly what its page
// needs and nothing another page keeps; a page reachable later joins the
// union with a target of its own.
export interface VoyagesTarget {
	readonly mode: "voyages";
	readonly pieceId: string | null;
	readonly voyageId: string;
}

export type ConsoleTarget = VoyagesTarget;

export type Navigate = (target: ConsoleTarget) => void;
