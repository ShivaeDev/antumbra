import type { browse } from "@antumbra/domain-changes/queries/browse.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { CONTROL, TEXT_CONTROL } from "@antumbra/glass-components/classes.ts";
import { groupTitle, QUAY_GROUPS } from "#groups.ts";
export type Filters = { readonly query: string; readonly repositoryId: RepoId | null; readonly status: "all" | keyof typeof groupTitle };
export const INITIAL: Filters = { query: "", repositoryId: null, status: "all" };
export const unfiltered = (filters: Filters): boolean => filters.query === "" && filters.repositoryId === null && filters.status === "all";
const statusOf = (value: string): Filters["status"] => QUAY_GROUPS.find((group) => group === value) ?? "all";
export const QuayFilters = (props: {
	readonly filters: Filters;
	readonly onFilters: (filters: Filters) => void;
	readonly repositories: typeof browse.output.Type.repositories;
}) => (
	<div className="flex flex-col gap-2 border-b border-border p-3">
		<input
			aria-label="Search pull requests"
			className={TEXT_CONTROL}
			onChange={(event) => props.onFilters({ ...props.filters, query: event.target.value })}
			placeholder="Search title, number or work…"
			type="search"
			value={props.filters.query}
		/>
		<div className="grid grid-cols-2 gap-2">
			<label className="text-2xs text-muted-foreground">
				Status
				<select
					aria-label="Status"
					className={CONTROL}
					onChange={(event) => props.onFilters({ ...props.filters, status: statusOf(event.target.value) })}
					value={props.filters.status}
				>
					<option value="all">All statuses</option>
					{QUAY_GROUPS.map((group) => (
						<option key={group} value={group}>
							{groupTitle[group]}
						</option>
					))}
				</select>
			</label>
			<label className="text-2xs text-muted-foreground">
				Repository
				<select
					aria-label="Repository"
					className={CONTROL}
					onChange={(event) =>
						props.onFilters({ ...props.filters, repositoryId: event.target.value === "all" ? null : RepoId.make(event.target.value) })
					}
					value={props.filters.repositoryId ?? "all"}
				>
					<option value="all">All repositories</option>
					{props.repositories.map((repo) => (
						<option key={repo.id} value={repo.id}>
							{repo.name}
						</option>
					))}
				</select>
			</label>
		</div>
	</div>
);
