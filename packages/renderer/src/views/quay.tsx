import { useState } from "react";
import { watchQuay } from "#adapters/trpc-quay.ts";
import { Button } from "#components/ui/button.tsx";
import { useFeed } from "#hooks/feed.ts";
import { type QuayFilter, rowsIn, shownGroups } from "#quay/groups.ts";
import { QuayGroupPanel } from "#views/quay-group.tsx";
import { QuayHeader } from "#views/quay-header.tsx";

export const QuayPanel = ({
	onError,
}: {
	readonly onError: (message: string) => void;
}) => {
	const { error: feedError, value: quay } = useFeed("quay", watchQuay);
	const [only, setOnly] = useState<QuayFilter>("all");

	if (quay === undefined) {
		return (
			<section className="m-auto text-xs text-muted-foreground">
				{feedError === undefined
					? "taking a sight…"
					: `feed lost: ${feedError}`}
			</section>
		);
	}
	const groups = shownGroups(only);
	const shown = groups.reduce(
		(total, group) => total + rowsIn(quay, group).length,
		0,
	);
	return (
		<section className="flex min-w-0 flex-1 flex-col bg-background font-sans text-foreground">
			<QuayHeader onError={onError} onOnly={setOnly} only={only} view={quay} />
			<div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-3">
				{feedError === undefined ? null : (
					<p className="text-xs text-destructive">feed lost: {feedError}</p>
				)}
				{quay.rows.length === 0 ? (
					<p className="text-xs text-muted-foreground">
						Nothing at the quay — a change shows up here once a piece opens one,
						or once you adopt one by hand
					</p>
				) : null}
				{groups.map((group) => (
					<QuayGroupPanel
						group={group}
						key={group}
						rows={rowsIn(quay, group)}
					/>
				))}
				{quay.rows.length > 0 && shown === 0 ? (
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-xs text-muted-foreground">
							Nothing lies in that group right now
						</span>
						<Button onClick={() => setOnly("all")} size="sm" variant="ghost">
							Show everything
						</Button>
					</div>
				) : null}
			</div>
		</section>
	);
};
