import { Live } from "@antumbra/glass-client/live.tsx";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { ACT } from "@antumbra/glass-components/classes.ts";
import { ReposDialog } from "@antumbra/glass-repos/repos-dialog.tsx";
import { useState } from "react";
import type { SessionsApi } from "#glass.ts";
import { Roster } from "#roster.tsx";
import { SpawnDialog } from "#spawn-dialog.tsx";

export const FleetPanel = (props: {
	readonly api: SessionsApi;
	readonly sessionId?: string | undefined;
	readonly onSession: (id: string) => void;
	readonly onOpenTranscript?: ((id: string) => void) | undefined;
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onVoyage: (id: string) => void;
}) => {
	const [smoothers, setSmoothers] = useState(false);
	return (
		<section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
			<div className="flex flex-wrap items-center gap-2">
				<h2 className="min-w-0 flex-1 text-base">Fleet</h2>
				<label className={cn(ACT, "has-focus-visible:ring-2 has-focus-visible:ring-ring/60")}>
					<input
						aria-label="Show smoothers"
						checked={smoothers}
						className="size-3 accent-primary"
						onChange={(event) => setSmoothers(event.target.checked)}
						type="checkbox"
					/>
					Show smoothers
				</label>
				<ReposDialog api={props.api} />
				<SpawnDialog api={props.api} />
			</div>
			<Live query={props.api.agents.roster} input={{}} waiting="Reading the fleet…">
				{(agents) => {
					const shown = smoothers ? agents : agents.filter((agent) => agent.role !== "smoother");
					if (shown.length > 0) return <Roster {...props} agents={shown} />;
					return (
						<p className="text-xs text-muted-foreground">
							{agents.length === 0 ? "No agents yet — spawn one to put it here" : "Only smoothers are here. Show smoothers to see them."}
						</p>
					);
				}}
			</Live>
		</section>
	);
};
