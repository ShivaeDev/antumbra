import type { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { ActButton } from "@antumbra/glass-components/act-button.tsx";
import { Badge } from "@antumbra/glass-components/shadcn/badge.tsx";
import type { ReposApi } from "#glass.ts";

const Registered = (props: { readonly api: ReposApi; readonly registered: typeof repo.Row.Type }) => (
	<div className="flex min-w-0 items-center gap-2 py-2">
		<div className="min-w-0 flex-1">
			<div className="flex min-w-0 items-center gap-2">
				<span className="min-w-0 truncate text-sm font-medium">{props.registered.name}</span>
				<Badge variant="secondary">{props.registered.defaultRef}</Badge>
			</div>
			<div className="font-mono text-xs text-muted-foreground wrap-anywhere">{props.registered.source}</div>
		</div>
		<ActButton command={props.api.repos.forget} input={{ id: props.registered.id }} label="Forget" />
	</div>
);

export const ReposList = (props: { readonly api: ReposApi; readonly repos: readonly (typeof repo.Row.Type)[] }) =>
	props.repos.length === 0 ? (
		<p className="text-xs text-muted-foreground">No repositories yet.</p>
	) : (
		<div className="flex max-h-64 flex-col divide-y overflow-y-auto">
			{props.repos.map((registered) => (
				<Registered api={props.api} key={registered.id} registered={registered} />
			))}
		</div>
	);
