import { ChangeId } from "@antumbra/domain-changes/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { useState } from "react";
import type { ChangesApi } from "#glass.ts";
import { QuayDetail } from "#quay-detail.tsx";
import { QuayEmpty } from "#quay-empty.tsx";
import { type Filters, INITIAL } from "#quay-filters.tsx";
import { QuayHeader } from "#quay-header.tsx";
import { QuayMaster } from "#quay-master.tsx";
export const QuayPanel = (props: {
	readonly api: ChangesApi;
	readonly selectedId?: string | undefined;
	readonly onSelect: (id: string | undefined) => void;
	readonly onOpenSession: (id: string) => void;
}) => {
	const [filters, setFilters] = useState<Filters>(INITIAL);
	return (
		<Live
			input={{ ...filters, selectedId: props.selectedId === undefined ? null : ChangeId.make(props.selectedId) }}
			query={props.api.changes.browse}
		>
			{(view) => (
				<section className="flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground">
					<QuayHeader api={props.api} sightedAt={view.sightedAt} />
					<div className="flex min-h-0 flex-1">
						<QuayMaster view={view} filters={filters} setFilters={setFilters} selectedId={props.selectedId} onSelect={props.onSelect} />
						<div className={`min-h-0 min-w-0 flex-1 overflow-y-auto ${props.selectedId === undefined ? "hidden md:flex" : "flex"}`}>
							{view.selected === null ? (
								<QuayEmpty total={view.total} selectedId={props.selectedId} onBack={() => props.onSelect(undefined)} />
							) : (
								<QuayDetail api={props.api} item={view.selected} onBack={() => props.onSelect(undefined)} onOpenSession={props.onOpenSession} />
							)}
						</div>
					</div>
				</section>
			)}
		</Live>
	);
};
