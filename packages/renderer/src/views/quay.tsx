import { useState } from "react";
import { watchQuay } from "#adapters/trpc-quay.ts";
import { Button } from "#components/ui/button.tsx";
import { useFeed } from "#hooks/feed.ts";
import { cn } from "#lib/utils.ts";
import { filterQuayChanges, type QuayFilters, quayChanges, repositoriesOf } from "#quay/changes.ts";
import { QuayDetail } from "#views/quay-detail.tsx";
import { QuayHeader } from "#views/quay-header.tsx";
import { QuayMaster } from "#views/quay-master.tsx";

const INITIAL_FILTERS = {
	query: "",
	repositoryId: null,
	status: "all",
} as const;

type SelectionState = "empty" | "missing" | "none";

const selectionState = (changeCount: number, selectedId: string | undefined): SelectionState => {
	if (changeCount === 0) {
		return "empty";
	}
	return selectedId === undefined ? "none" : "missing";
};

const SELECTION_COPY: Readonly<Record<SelectionState, { readonly detail: string; readonly title: string }>> = {
	empty: {
		detail: "A pull request appears once a piece opens one, or once you adopt one by hand.",
		title: "Nothing at the quay",
	},
	missing: {
		detail: "It may have landed or been withdrawn since this window last pointed to it.",
		title: "Pull request no longer at the quay",
	},
	none: {
		detail: "Choose one from the list to inspect its status, linked work and origin.",
		title: "Select a pull request",
	},
};

const MissingSelection = ({ onBack, state }: { readonly onBack: () => void; readonly state: SelectionState }) => (
	<div className="m-auto flex max-w-sm flex-col items-center gap-2 px-6 text-center">
		<h3 className="text-sm font-medium">{SELECTION_COPY[state].title}</h3>
		<p className="text-xs text-muted-foreground">{SELECTION_COPY[state].detail}</p>
		{state === "missing" ? (
			<Button onClick={onBack} size="sm" variant="outline">
				Back to pull requests
			</Button>
		) : null}
	</div>
);

export const QuayPanel = ({
	onError,
	onSelect,
	selectedId,
}: {
	readonly onError: (message: string) => void;
	readonly onSelect: (changeId: string | undefined) => void;
	readonly selectedId: string | undefined;
}) => {
	const { error: feedError, value: quay } = useFeed("quay", watchQuay);
	const [filters, setFilters] = useState<QuayFilters>(INITIAL_FILTERS);

	if (quay === undefined) {
		return (
			<section aria-live="polite" className="m-auto text-xs text-muted-foreground">
				{feedError === undefined ? "taking a sight…" : `feed lost: ${feedError}`}
			</section>
		);
	}
	const changes = quayChanges(quay);
	const shown = filterQuayChanges(changes, filters);
	const selected = changes.find((item) => item.change.id === selectedId);
	const noSelection = selectedId === undefined;
	const absent = selectionState(changes.length, selectedId);
	return (
		<section className="flex min-w-0 flex-1 flex-col bg-background font-sans text-foreground">
			<QuayHeader onError={onError} view={quay} />
			{feedError === undefined ? null : (
				<p className="border-destructive/30 border-b bg-destructive/10 px-4 py-1.5 text-xs text-destructive" role="alert">
					feed lost: {feedError}
				</p>
			)}
			<div className="flex min-h-0 flex-1">
				<QuayMaster
					all={changes}
					filters={filters}
					onFilters={setFilters}
					onSelect={onSelect}
					repositories={repositoriesOf(changes)}
					selectedId={selectedId}
					shown={shown}
				/>
				<div className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto", noSelection ? "hidden md:flex" : "flex")}>
					{selected === undefined ? (
						<MissingSelection onBack={() => onSelect(undefined)} state={absent} />
					) : (
						<QuayDetail item={selected} onBack={() => onSelect(undefined)} onError={onError} />
					)}
				</div>
			</div>
		</section>
	);
};
