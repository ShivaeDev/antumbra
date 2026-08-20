import type { QuayRow } from "@antumbra/contract";
import { openExternal } from "#adapters/bridge.ts";
import { Badge } from "#components/ui/badge.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "#components/ui/card.tsx";
import { cn } from "#lib/utils.ts";
import {
	type ChangeMark,
	changeMarks,
	changeNumber,
	hasLanded,
} from "#quay/marks.ts";
import { whenLabel } from "#voyages/labels.ts";

const TONE_VARIANTS: Readonly<
	Record<
		ChangeMark["tone"],
		"destructive" | "info" | "outline" | "success" | "warning"
	>
> = {
	destructive: "destructive",
	info: "info",
	muted: "outline",
	success: "success",
	warning: "warning",
};

// why: the change opens where the repo lives — the merge is done there, and a
// window that embedded the host would be pretending otherwise.
const ChangeName = ({ row }: { readonly row: QuayRow }) => {
	const { change } = row;
	const number = changeNumber(change);
	const url = change.url;
	const name = (
		<>
			{number === "" ? null : (
				<span className="font-mono text-muted-foreground">{number}</span>
			)}{" "}
			{change.title}
		</>
	);
	if (url === null) {
		return <span className="min-w-0 text-xs font-medium">{name}</span>;
	}
	return (
		<a
			className="min-w-0 text-xs font-medium text-link underline-offset-4 hover:underline"
			href={url}
			onClick={(event) => {
				event.preventDefault();
				openExternal(url);
			}}
		>
			{name}
		</a>
	);
};

// why: three marks in three fixed places — checks, review, merge — so a card
// is read by where its colour sits rather than by parsing a run of words.
export const QuayCard = ({ row }: { readonly row: QuayRow }) => (
	<Card className={cn("gap-1", hasLanded(row.change) && "opacity-60")}>
		<CardHeader className="grid-cols-[1fr_auto] gap-x-2">
			<ChangeName row={row} />
			<Badge
				className="col-start-2 row-start-1 max-w-40 truncate font-mono"
				title={row.change.repoName}
				variant="outline"
			>
				{row.change.repoName}
			</Badge>
			<CardDescription className="col-start-1 wrap-anywhere">
				{row.voyageName} › {row.pieceTitle}
			</CardDescription>
		</CardHeader>
		<CardContent className="flex flex-wrap items-center gap-1">
			{changeMarks(row.change).map((mark) => (
				<Badge key={mark.key} variant={TONE_VARIANTS[mark.tone]}>
					{mark.label}
				</Badge>
			))}
			<span className="ml-auto shrink-0 pl-2 text-2xs text-muted-foreground">
				moved {whenLabel(row.change.activityAt)}
			</span>
		</CardContent>
	</Card>
);
