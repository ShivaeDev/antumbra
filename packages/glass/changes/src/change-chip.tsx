import type { pieceChangeView } from "@antumbra/domain-changes/rows/piece-change-view.ts";

type ChangeView = typeof pieceChangeView.Row.Type;

import { cn } from "@antumbra/glass-components/class-names.ts";
import { ExternalLink } from "@antumbra/glass-components/external-link.tsx";
import { changeMarks, changeName } from "#chip-marks.ts";

const toneOf = (change: ChangeView): string => (change.stage === "landed" ? "text-muted-foreground" : "text-link");

export const ChangeLink = ({ change }: { readonly change: ChangeView }) => {
	if (change.url === null) {
		return <span className="text-xs text-muted-foreground">{changeName(change)}</span>;
	}
	return (
		<ExternalLink className={cn("text-xs", toneOf(change))} url={change.url}>
			{changeName(change)}
		</ExternalLink>
	);
};

export const ChangeChip = ({ change }: { readonly change: ChangeView }) => (
	<span className="flex min-w-0 items-baseline gap-1.5 wrap-anywhere">
		<span className="text-xs text-muted-foreground">⛵</span>
		<ChangeLink change={change} />
		<span className="text-xs text-muted-foreground">{changeMarks(change)}</span>
	</span>
);
