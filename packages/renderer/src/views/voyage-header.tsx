import type { Fleet, VoyageView } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import { CaptainCall, FocusToggle } from "#views/voyage-acts.tsx";
import { VoyageRoleSettings } from "#views/voyage-agent-settings.tsx";
import { VoyageProgress } from "#views/voyage-progress.tsx";
import { VoyageSpend } from "#views/voyage-spend.tsx";
import { voyageStateLabel } from "#voyages/labels.ts";
import { voyageTone } from "#voyages/tone.ts";

export const VoyageHeader = ({
	fleet,
	onError,
	voyage,
}: {
	readonly fleet: Fleet | undefined;
	readonly onError: (message: string) => void;
	readonly voyage: VoyageView;
}) => (
	<header className="flex shrink-0 flex-col gap-2 border-b border-border bg-card px-5 py-3">
		<div className="flex min-w-0 flex-wrap items-center gap-2">
			<h1 className="min-w-0 flex-1 text-base wrap-anywhere">{voyage.name}</h1>
			<Badge variant={voyageTone[voyage.state]}>{voyageStateLabel[voyage.state]}</Badge>
			<CaptainCall captain={voyage.captain} onError={onError} voyageId={voyage.id} />
			<FocusToggle onError={onError} voyage={voyage} />
		</div>
		<VoyageRoleSettings backends={fleet?.backends ?? []} defaults={fleet?.roleSettings ?? []} voyage={voyage} />
		<p className="min-w-0 text-xs wrap-anywhere">
			<span className="text-2xs text-muted-foreground">North star </span>
			{voyage.northStar}
		</p>
		{voyage.context === "" ? null : <p className="min-w-0 whitespace-pre-wrap text-xs text-muted-foreground wrap-anywhere">{voyage.context}</p>}
		<div className="flex min-w-0 flex-wrap items-end gap-4">
			<div className="min-w-0 max-w-md flex-1">
				<VoyageProgress counts={voyage.counts} withLegend />
			</div>
			<VoyageSpend voyageId={voyage.id} />
		</div>
	</header>
);
