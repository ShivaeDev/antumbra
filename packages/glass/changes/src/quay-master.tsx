import type { browse } from "@antumbra/domain-changes/queries/browse.ts";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { type Filters, INITIAL, QuayFilters } from "#quay-filters.tsx";
import { QuayListRow } from "#quay-list-row.tsx";
export const QuayMaster = (props: {
	readonly view: typeof browse.output.Type;
	readonly filters: Filters;
	readonly setFilters: (filters: Filters) => void;
	readonly selectedId?: string | undefined;
	readonly onSelect: (id: string) => void;
}) => (
	<aside
		className={`min-h-0 w-full flex-col overflow-y-auto border-border md:flex md:w-80 md:shrink-0 md:border-r ${props.selectedId === undefined ? "flex" : "hidden"}`}
	>
		<QuayFilters filters={props.filters} onFilters={props.setFilters} repositories={props.view.repositories} />
		<div className="p-2">
			<p aria-live="polite" className="text-2xs text-muted-foreground">
				{props.view.rows.length} of {props.view.total} pull requests
			</p>
			<Button onClick={() => props.setFilters(INITIAL)} variant="link">
				Clear filters
			</Button>
			<nav aria-label="Pull requests">
				<ul className="flex flex-col gap-1">
					{props.view.rows.map((item) => (
						<QuayListRow key={item.id} item={item} current={item.id === props.selectedId} onSelect={props.onSelect} />
					))}
				</ul>
			</nav>
			{props.view.rows.length === 0 ? (
				<p className="text-xs text-muted-foreground">
					{props.view.total === 0
						? "Nothing at the quay — a change appears once a piece opens one, or once you adopt one by hand."
						: "No pull requests match these filters."}
				</p>
			) : null}
		</div>
	</aside>
);
