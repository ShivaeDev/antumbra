import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { tree } from "@antumbra/domain-sessions/queries/tree.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { useState } from "react";
import type { SessionsApi } from "#glass.ts";

const ended = (outcome: string | null): string => {
	switch (outcome) {
		case "completed":
			return "Finished";
		case "failed":
			return "Ended in error";
		case "interrupted":
			return "Stopped early";
		case "unknown":
			return "Ending not seen";
		default:
			return "Closed";
	}
};

const words = (node: typeof session.Row.Type): string => {
	const state = node.status === "open" ? "Open" : ended(node.outcome);
	return node.completeness === "incomplete" ? `${state} · Record incomplete` : state;
};

const TreeNode = (props: {
	readonly node: (typeof tree.output.Type)[number];
	readonly selected: string;
	readonly onSelect: (id: string) => void;
}) => (
	<button
		type="button"
		aria-current={props.selected === props.node.id ? "true" : undefined}
		className={cn("flex gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent", props.selected === props.node.id && "bg-secondary")}
		style={{ paddingLeft: `${0.5 + props.node.depth * 0.75}rem` }}
		onClick={() => props.onSelect(props.node.id)}
	>
		<span className="min-w-0 flex-1 truncate">{props.node.displayName}</span>
		<span className="text-muted-foreground">{words(props.node)}</span>
	</button>
);

export const SessionTreePanel = (props: {
	readonly api: Pick<SessionsApi, "sessions">;
	readonly sessionId: string;
	readonly selected: string;
	readonly onSelect: (id: string) => void;
}) => {
	const [open, setOpen] = useState(false);
	return (
		<Live query={props.api.sessions.tree} input={{ rootSessionId: SessionId.make(props.sessionId) }} waiting="Reading delegated work…">
			{(nodes) =>
				nodes.length < 2 ? null : (
					<section className="flex max-h-48 shrink-0 flex-col overflow-y-auto border-b border-border px-2 py-1">
						<button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="px-2 py-1 text-left text-xs">
							Delegated work
						</button>
						{open ? nodes.map((node) => <TreeNode node={node} selected={props.selected} onSelect={props.onSelect} key={node.id} />) : null}
					</section>
				)
			}
		</Live>
	);
};
