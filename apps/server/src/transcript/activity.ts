import type { Activity, SessionStanding } from "@antumbra/domain-sessions/rows/transcript-standing.ts";
import type { SessionTreeNode } from "#transcript/types.ts";

type Presence = "working" | "idle" | "asleep" | "ended" | "stranded";

const toolNames = (names: ReadonlyArray<string>): string =>
	names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} + ${names.length - 2} more`;

export const sessionActivity = (standing: SessionStanding, node: SessionTreeNode | undefined, presence: Presence | undefined): Activity => {
	const names = standing.open.map((tool) => tool.name);
	if (node?.status === "closed" || names.length === 0) {
		return { live: false, words: undefined };
	}
	return { live: presence === "working", words: toolNames(names) };
};
