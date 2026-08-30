import type { VoyageView } from "@antumbra/contract";
import { setCaptainBackend, setCrewBackend } from "#adapters/trpc-voyages.ts";
import { Badge } from "#components/ui/badge.tsx";
import {
	BackendSwitch,
	CaptainCall,
	FocusToggle,
} from "#views/voyage-acts.tsx";
import { VoyageProgress } from "#views/voyage-progress.tsx";
import { voyageStateLabel } from "#voyages/labels.ts";
import { voyageTone } from "#voyages/tone.ts";

export const VoyageHeader = ({
	onError,
	voyage,
}: {
	readonly onError: (message: string) => void;
	readonly voyage: VoyageView;
}) => (
	<header className="flex shrink-0 flex-col gap-2 border-b border-border bg-card px-5 py-3">
		<div className="flex min-w-0 flex-wrap items-center gap-2">
			<h1 className="min-w-0 flex-1 text-base wrap-anywhere">{voyage.name}</h1>
			<Badge variant={voyageTone[voyage.state]}>
				{voyageStateLabel[voyage.state]}
			</Badge>
			<BackendSwitch
				onError={onError}
				sailing={voyage.captainBackend}
				seat="Captain"
				seatBackend={setCaptainBackend}
				voyageId={voyage.id}
			/>
			<BackendSwitch
				onError={onError}
				sailing={voyage.crewBackend}
				seat="Crew"
				seatBackend={setCrewBackend}
				voyageId={voyage.id}
			/>
			<CaptainCall
				captain={voyage.captain}
				onError={onError}
				voyageId={voyage.id}
			/>
			<FocusToggle onError={onError} voyage={voyage} />
		</div>
		<p className="min-w-0 text-xs wrap-anywhere">
			<span className="text-2xs text-muted-foreground">North star </span>
			{voyage.northStar}
		</p>
		{voyage.context === "" ? null : (
			<p className="min-w-0 whitespace-pre-wrap text-xs text-muted-foreground wrap-anywhere">
				{voyage.context}
			</p>
		)}
		<div className="max-w-md">
			<VoyageProgress counts={voyage.counts} withLegend />
		</div>
	</header>
);
