import type { ChangeView } from "@antumbra/contract";
import { cn } from "#lib/utils.ts";
import { ExternalLink } from "#views/external-link.tsx";
import { changeMarks, changeName } from "#voyages/change-marks.ts";

// why: a landed change is history rather than news, so it recedes beside the
// ones still owed something.
const toneOf = (change: ChangeView): string =>
	change.stage === "landed" ? "text-muted-foreground" : "text-link";

// why: the change opens where the repo lives — the merge is done there, and a
// window that embedded the host would be pretending otherwise.
export const ChangeLink = ({ change }: { readonly change: ChangeView }) => {
	if (change.url === null) {
		return (
			<span className="text-xs text-muted-foreground">
				{changeName(change)}
			</span>
		);
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
