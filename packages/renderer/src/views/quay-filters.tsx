import { Search } from "lucide-react";
import { Input } from "#components/ui/input.tsx";
import type { QuayFilters, QuayRepository } from "#quay/changes.ts";
import { quayStatusFrom } from "#quay/changes.ts";
import { groupTitle, QUAY_GROUPS } from "#quay/groups.ts";

const SELECT =
	"h-7 min-w-0 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40";

export const QuayFilterControls = ({
	filters,
	onFilters,
	repositories,
}: {
	readonly filters: QuayFilters;
	readonly onFilters: (filters: QuayFilters) => void;
	readonly repositories: ReadonlyArray<QuayRepository>;
}) => (
	<div className="flex flex-col gap-2 border-border border-b p-3">
		<label className="relative block" htmlFor="quay-search">
			<span className="sr-only">Search pull requests</span>
			<Search
				aria-hidden="true"
				className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				className="pl-7"
				id="quay-search"
				onChange={(event) =>
					onFilters({ ...filters, query: event.target.value })
				}
				placeholder="Search title, number or work…"
				type="search"
				value={filters.query}
			/>
		</label>
		<div className="grid grid-cols-2 gap-2">
			<label className="flex min-w-0 flex-col gap-1 text-2xs text-muted-foreground">
				Status
				<select
					className={SELECT}
					onChange={(event) =>
						onFilters({
							...filters,
							status: quayStatusFrom(event.target.value),
						})
					}
					value={filters.status}
				>
					<option value="all">All statuses</option>
					{QUAY_GROUPS.map((group) => (
						<option key={group} value={group}>
							{groupTitle[group]}
						</option>
					))}
				</select>
			</label>
			<label className="flex min-w-0 flex-col gap-1 text-2xs text-muted-foreground">
				Repository
				<select
					className={SELECT}
					onChange={(event) => {
						const repositoryId =
							event.target.value === "all" ? null : event.target.value;
						onFilters({ ...filters, repositoryId });
					}}
					value={filters.repositoryId ?? "all"}
				>
					<option value="all">All repositories</option>
					{repositories.map((repository) => (
						<option key={repository.id} value={repository.id}>
							{repository.name}
						</option>
					))}
				</select>
			</label>
		</div>
	</div>
);
