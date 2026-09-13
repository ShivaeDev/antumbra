import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { PageHeader } from "@antumbra/glass-components/compositions/page-header.tsx";
import { Label } from "@antumbra/glass-components/shadcn/label.tsx";
import { ScrollArea } from "@antumbra/glass-components/shadcn/scroll-area.tsx";
import { Switch } from "@antumbra/glass-components/shadcn/switch.tsx";
import { ReposDialog } from "@antumbra/glass-repos/repos-dialog.tsx";
import { useId, useState } from "react";
import type { SessionsApi } from "#glass.ts";
import { Roster } from "#roster.tsx";
import { SpawnDialog } from "#spawn-dialog.tsx";

const NO_AGENTS = "No agents yet — spawn one to put it here";

const ONLY_SMOOTHERS = "Only smoothers are here. Show smoothers to see them.";

interface Props {
	readonly api: SessionsApi;
	readonly sessionId?: string | undefined;
	readonly onSession: (id: string) => void;
	readonly onOpenTranscript?: ((id: string) => void) | undefined;
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onVoyage: (id: string) => void;
}

const Shown = ({
	agents,
	smoothers,
	...rest
}: Props & { readonly agents: readonly (typeof agentReading.Row.Type)[]; readonly smoothers: boolean }) => {
	const shown = smoothers ? agents : agents.filter((agent) => agent.role !== "smoother");
	if (shown.length > 0) return <Roster {...rest} agents={shown} />;
	return <p className="text-xs text-muted-foreground">{agents.length === 0 ? NO_AGENTS : ONLY_SMOOTHERS}</p>;
};

export const FleetPanel = (props: Props) => {
	const named = useId();
	const [smoothers, setSmoothers] = useState(false);
	return (
		<section className="flex min-h-0 min-w-0 flex-1 flex-col px-6 pt-5">
			<PageHeader
				actions={
					<>
						<Label htmlFor={named}>Show smoothers</Label>
						<Switch checked={smoothers} id={named} onCheckedChange={setSmoothers} />
						<ReposDialog api={props.api} />
						<SpawnDialog api={props.api} />
					</>
				}
				title="Fleet"
			/>
			<ScrollArea className="min-h-0 flex-1">
				<div className="space-y-8 pb-10">
					<Live query={props.api.agents.roster} input={{}} waiting="Reading the fleet…">
						{(agents) => <Shown {...props} agents={agents} smoothers={smoothers} />}
					</Live>
				</div>
			</ScrollArea>
		</section>
	);
};
