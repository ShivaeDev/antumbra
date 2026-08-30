import type { BackgroundTask, SessionState } from "@antumbra/vocabulary/session-events";
import { Badge } from "#components/ui/badge.tsx";
import { stateWords } from "#transcript/labels.ts";
import type { SessionStanding } from "#transcript/standing.ts";
import { cacheShare, usageLabel } from "#transcript/usage-label.ts";

// why: waiting is the one state that wants the reader now, and it is warned
// rather than alarmed — nothing is broken, somebody is simply being asked.
// Idle is the ordinary quiet between turns and takes no colour at all.
const STATE: Record<SessionState, React.ComponentProps<typeof Badge>["variant"]> = {
	"awaiting-input": "warning",
	idle: "secondary",
	running: "success",
};

const taskWords = (task: BackgroundTask): string => (task.description.trim() === "" ? task.kind : `${task.kind}: ${task.description.trim()}`);

const Background = ({ tasks }: { readonly tasks: ReadonlyArray<BackgroundTask> }) =>
	tasks.length === 0 ? null : (
		<span className="min-w-0 truncate">
			{tasks.length} background · {tasks.map(taskWords).join(", ")}
		</span>
	);

// why: the split is read here rather than only in the transcript, because the
// question it answers — did this turn come out of the cache — is asked about
// the session as a whole and would otherwise mean scrolling back to the last
// usage divider to find out.
export const SessionStandingBar = ({ standing }: { readonly standing: SessionStanding }) => {
	const share = standing.usage === undefined ? undefined : cacheShare(standing.usage);

	return (
		<div className="flex min-w-0 shrink-0 items-center gap-2 border-t border-border px-4 py-1.5 font-mono text-2xs text-muted-foreground">
			{standing.state === undefined ? (
				<span className="shrink-0">state unreported</span>
			) : (
				<Badge variant={STATE[standing.state]}>{stateWords[standing.state]}</Badge>
			)}
			{share === undefined ? null : <span className="shrink-0 font-medium text-foreground">{Math.round(share * 100)}% cache</span>}
			<Background tasks={standing.background} />
			<span className="min-w-0 flex-1 truncate text-right">
				{standing.usage === undefined ? "no usage reported yet" : usageLabel(standing.usage)}
			</span>
		</div>
	);
};
