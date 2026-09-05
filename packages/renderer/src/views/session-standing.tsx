import type { SessionTreeNode } from "@antumbra/contract";
import type { BackgroundTask, SessionState } from "@antumbra/vocabulary/session-events";
import { Badge } from "#components/ui/badge.tsx";
import type { Activity } from "#transcript/activity.ts";
import { stateWords } from "#transcript/labels.ts";
import type { SessionStanding } from "#transcript/standing.ts";
import { cacheShare, usageFacts } from "#transcript/usage-label.ts";
import { AgentSpend } from "#views/agent-spend.tsx";
import { outcomeWords } from "#views/session-outcome-words.ts";

const STATE: Record<SessionState, React.ComponentProps<typeof Badge>["variant"]> = {
	"awaiting-input": "warning",
	idle: "secondary",
	running: "success",
};

const StateCell = ({ node, state }: { readonly node: SessionTreeNode | undefined; readonly state: SessionState | undefined }) => {
	if (state !== undefined) {
		return <Badge variant={STATE[state]}>{stateWords[state]}</Badge>;
	}
	if (node === undefined || node.depth === 0) {
		return <span>no state reported yet</span>;
	}
	if (node.status === "open") {
		return <span>Open</span>;
	}
	return <span>{node.outcome === null ? "Closed" : outcomeWords[node.outcome]}</span>;
};

const taskWords = (task: BackgroundTask): string => (task.description.trim() === "" ? task.kind : `${task.kind}: ${task.description.trim()}`);

const Background = ({ tasks }: { readonly tasks: ReadonlyArray<BackgroundTask> }) =>
	tasks.length === 0 ? null : (
		<span>
			{tasks.length} background · {tasks.map(taskWords).join(", ")}
		</span>
	);

const Usage = ({ standing }: { readonly standing: SessionStanding }) => {
	if (standing.usage === undefined) {
		return <span>no usage reported yet</span>;
	}
	const share = cacheShare(standing.usage);
	return (
		<span className="flex min-w-0 flex-wrap justify-end gap-x-2">
			{share === undefined ? null : <span className="whitespace-nowrap font-medium text-foreground">{Math.round(share * 100)}% cache</span>}
			{usageFacts(standing.usage).map((fact) => (
				<span className="whitespace-nowrap" key={fact}>
					{fact}
				</span>
			))}
		</span>
	);
};

export const SessionStandingBar = ({
	activity,
	agentId,
	node,
	standing,
}: {
	readonly activity: Activity;
	readonly agentId?: string | undefined;
	readonly node?: SessionTreeNode | undefined;
	readonly standing: SessionStanding;
}) => (
	<div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-4 py-1.5 font-mono text-2xs text-muted-foreground">
		<span className="flex shrink-0 items-center gap-2">
			<StateCell node={node} state={standing.state} />
			{activity.words === undefined ? null : <span>{activity.words}</span>}
		</span>
		<Background tasks={standing.background} />
		<span className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-x-2">
			<Usage standing={standing} />
			{agentId === undefined ? null : <AgentSpend agentId={agentId} />}
		</span>
	</div>
);
