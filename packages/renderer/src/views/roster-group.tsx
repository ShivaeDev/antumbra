import { Separator } from "#components/ui/separator.tsx";
import {
	type RosterGroup,
	STANDING_LABEL,
	type Standing,
} from "#fleet/roster.ts";
import { cn } from "#lib/utils.ts";
import { AgentCard } from "#views/agent-card.tsx";

const DOT: Readonly<Record<Standing, string>> = {
	quiet: "bg-muted-foreground",
	retired: "bg-border-strong",
	waiting: "bg-info",
	working: "bg-success",
};

export const RosterGroupPanel = ({
	group,
	onError,
	onSelect,
	selected,
}: {
	readonly group: RosterGroup;
	readonly onError: (message: string) => void;
	readonly onSelect: (sessionId: string) => void;
	readonly selected: string | undefined;
}) => (
	<section className="flex min-w-0 flex-col gap-2">
		<header className="flex items-center gap-2">
			<span
				className={cn("size-1.5 shrink-0 rounded-full", DOT[group.standing])}
			/>
			<h3 className="text-2xs font-medium text-muted-foreground">
				{STANDING_LABEL[group.standing]}
			</h3>
			<span className="text-2xs text-muted-foreground">
				{group.agents.length}
			</span>
			<Separator className="min-w-0 flex-1" />
		</header>
		<div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-2">
			{group.agents.map((agent) => (
				<AgentCard
					agent={agent}
					key={agent.id}
					onError={onError}
					onSelect={onSelect}
					selected={selected}
				/>
			))}
		</div>
	</section>
);
