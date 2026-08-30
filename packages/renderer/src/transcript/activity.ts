import type { SessionSummary, SessionTreeNode } from "@antumbra/contract";
import type { SessionStanding } from "#transcript/standing.ts";
import { presenceWords } from "#views/session-presence-words.ts";

type Presence = SessionSummary["presence"];

export interface Activity {
	readonly live: boolean;
	readonly words: string | undefined;
}

const toolNames = (names: ReadonlyArray<string>): string =>
	names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} + ${names.length - 2} more`;

export const sessionActivity = (standing: SessionStanding, node: SessionTreeNode | undefined, presence: Presence | undefined): Activity => {
	const names = standing.open.map((tool) => tool.name);
	if (node?.status === "closed" || names.length === 0) {
		return { live: false, words: undefined };
	}
	const calls = toolNames(names);
	if (presence === "working") {
		return { live: true, words: `running ${calls}` };
	}
	if (presence === "asleep" || presence === "ended" || presence === "stranded") {
		return { live: false, words: `${presenceWords[presence]} · ${calls} unfinished` };
	}
	return { live: false, words: `${calls} unfinished` };
};
