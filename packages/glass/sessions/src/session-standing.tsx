import type { Activity, SessionStanding } from "@antumbra/domain-sessions/rows/transcript-standing.ts";
import { Badge } from "@antumbra/glass-components/ui/badge.tsx";
import { money } from "#costs/format.ts";
import { cacheShare, usageFacts } from "#transcript/usage-label.ts";

const stateWords = { "awaiting-input": "awaiting input", idle: "idle", running: "running" };

const spentWords = (spent: SessionStanding["models"][number]): string =>
	spent.costUsd === null ? `${spent.model} cost not reported` : `${spent.model} ${money(spent.costUsd)}`;

const modelsTitle = (models: SessionStanding["models"]): string | undefined => (models.length < 2 ? undefined : models.map(spentWords).join(" · "));

export const SessionStandingBar = ({ activity, standing }: { readonly activity: Activity; readonly standing: SessionStanding }) => {
	const share = standing.usage === undefined ? undefined : cacheShare(standing.usage);
	return (
		<div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-4 py-1.5 font-mono text-xs text-muted-foreground">
			{standing.state === undefined ? (
				<span>no state reported yet</span>
			) : (
				<Badge variant={standing.state === "running" ? "success" : "secondary"}>{stateWords[standing.state]}</Badge>
			)}
			{activity.words === undefined ? null : <span>{activity.words}</span>}
			{standing.background.length === 0 ? null : (
				<span>
					{standing.background.length} background ·{" "}
					{standing.background.map((task) => (task.description.trim() === "" ? task.kind : `${task.kind}: ${task.description.trim()}`)).join(", ")}
				</span>
			)}
			<span className="ml-auto flex min-w-0 flex-wrap justify-end gap-x-2" title={modelsTitle(standing.models)}>
				{share === undefined ? null : <span className="font-medium text-foreground">{Math.round(share * 100)}% cache</span>}
				{standing.usage === undefined ? <span>no usage reported yet</span> : usageFacts(standing.usage).map((fact) => <span key={fact}>{fact}</span>)}
			</span>
		</div>
	);
};
