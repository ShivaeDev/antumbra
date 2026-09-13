import type { browse } from "@antumbra/domain-changes/queries/browse.ts";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import type { QuayChange } from "#glass.ts";
import { type Filters, INITIAL, QuayFilters } from "#quay-filters.tsx";
import { QuayListRow } from "#quay-list-row.tsx";

interface Listing {
	readonly items: readonly QuayChange[];
	readonly selectedId?: string | undefined;
	readonly onSelect: (id: string) => void;
}

const QuayRows = ({ items, selectedId, onSelect }: Listing) => (
	<ul className="flex flex-col gap-1">
		{items.map((item) => (
			<QuayListRow key={item.id} item={item} current={item.id === selectedId} onSelect={onSelect} />
		))}
	</ul>
);

const LandedRows = (props: Listing) =>
	props.items.length === 0 ? null : (
		<section aria-labelledby="quay-landed-heading" className="mt-3 flex flex-col gap-1">
			<h3 className="border-border border-t pt-2 text-2xs text-muted-foreground" id="quay-landed-heading">
				Landed
			</h3>
			<QuayRows {...props} />
		</section>
	);

export const QuayMaster = (props: {
	readonly view: typeof browse.output.Type;
	readonly filters: Filters;
	readonly setFilters: (filters: Filters) => void;
	readonly selectedId?: string | undefined;
	readonly onSelect: (id: string) => void;
}) => {
	const listing = { onSelect: props.onSelect, selectedId: props.selectedId };
	return (
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
					<QuayRows {...listing} items={props.view.rows.filter((item) => item.group !== "landed")} />
					<LandedRows {...listing} items={props.view.rows.filter((item) => item.group === "landed")} />
				</nav>
				{props.view.rows.length === 0 && props.view.total > 0 ? (
					<p className="text-xs text-muted-foreground">No pull requests match these filters.</p>
				) : null}
			</div>
		</aside>
	);
};
