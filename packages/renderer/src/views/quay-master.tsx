import { Button } from "#components/ui/button.tsx";
import { cn } from "#lib/utils.ts";
import type { QuayChange, QuayFilters, QuayRepository } from "#quay/changes.ts";
import { QuayFilterControls } from "#views/quay-filters.tsx";
import { QuayListRow } from "#views/quay-list-row.tsx";

const filtersActive = (filters: QuayFilters): boolean => filters.query !== "" || filters.repositoryId !== null || filters.status !== "all";

const ChangeList = ({
	onSelect,
	selectedId,
	shown,
}: {
	readonly onSelect: (changeId: string) => void;
	readonly selectedId: string | undefined;
	readonly shown: ReadonlyArray<QuayChange>;
}) => (
	<nav aria-label="Pull requests">
		<ul className="flex flex-col gap-1">
			{shown.map((item) => (
				<QuayListRow current={item.change.id === selectedId} item={item} key={item.change.id} onSelect={onSelect} />
			))}
		</ul>
	</nav>
);

export const QuayMaster = ({
	all,
	filters,
	onFilters,
	onSelect,
	repositories,
	selectedId,
	shown,
}: {
	readonly all: ReadonlyArray<QuayChange>;
	readonly filters: QuayFilters;
	readonly onFilters: (filters: QuayFilters) => void;
	readonly onSelect: (changeId: string) => void;
	readonly repositories: ReadonlyArray<QuayRepository>;
	readonly selectedId: string | undefined;
	readonly shown: ReadonlyArray<QuayChange>;
}) => (
	<aside
		className={cn(
			"min-h-0 w-full flex-col bg-card/35 md:flex md:w-80 md:shrink-0 md:border-border md:border-r",
			selectedId === undefined ? "flex" : "hidden",
		)}
	>
		<QuayFilterControls filters={filters} onFilters={onFilters} repositories={repositories} />
		<div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
			<div className="flex items-center px-1 pb-1.5">
				<p aria-live="polite" className="text-2xs text-muted-foreground">
					{shown.length} of {all.length} pull requests
				</p>
				{filtersActive(filters) ? (
					<Button className="ml-auto h-auto px-1 py-0" onClick={() => onFilters({ query: "", repositoryId: null, status: "all" })} variant="link">
						Clear filters
					</Button>
				) : null}
			</div>
			{all.length === 0 ? (
				<p className="px-1 py-3 text-xs text-muted-foreground">
					Nothing at the quay — a change appears once a piece opens one, or once you adopt one by hand.
				</p>
			) : null}
			{all.length > 0 && shown.length === 0 ? <p className="px-1 py-3 text-xs text-muted-foreground">No pull requests match these filters.</p> : null}
			{shown.length === 0 ? null : <ChangeList onSelect={onSelect} selectedId={selectedId} shown={shown} />}
		</div>
	</aside>
);
