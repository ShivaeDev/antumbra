import type { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { CommandAct } from "@antumbra/glass-components/act.tsx";
import { NOTE } from "@antumbra/glass-components/classes.ts";
import type { ReposApi } from "#glass.ts";

const Registered = (props: { readonly api: ReposApi; readonly registered: typeof repo.Row.Type }) => (
	<div className="flex min-w-0 items-start gap-2 border-b border-border py-2 last:border-b-0">
		<div className="min-w-0 flex-1">
			<div className="text-xs font-medium wrap-anywhere">
				{props.registered.name} <span className="rounded border border-border px-1">{props.registered.defaultRef}</span>
			</div>
			<div className="font-mono text-2xs text-muted-foreground wrap-anywhere">{props.registered.source}</div>
		</div>
		<CommandAct command={props.api.repos.forget} input={{ id: props.registered.id }} label="Forget" />
	</div>
);

export const ReposList = (props: { readonly api: ReposApi; readonly repos: readonly (typeof repo.Row.Type)[] }) => (
	<div className="my-3 flex max-h-64 flex-col overflow-y-auto">
		{props.repos.length === 0 ? (
			<span className={NOTE}>no repositories yet — add one below</span>
		) : (
			props.repos.map((registered) => <Registered api={props.api} key={registered.id} registered={registered} />)
		)}
	</div>
);
