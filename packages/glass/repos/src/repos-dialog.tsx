import type { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@antumbra/glass-components/shadcn/dialog.tsx";
import { AddRepo } from "#add-repo.tsx";
import type { ReposApi } from "#glass.ts";
import { ReposList } from "#repos-list.tsx";

const Registry = (props: { readonly api: ReposApi; readonly repos: readonly (typeof repo.Row.Type)[] }) => (
	<Dialog>
		<DialogTrigger asChild>
			<Button size="sm" variant="outline">
				Repositories <span className="text-muted-foreground">{props.repos.length}</span>
			</Button>
		</DialogTrigger>
		<DialogContent className="sm:max-w-lg">
			<DialogHeader>
				<DialogTitle>Repositories</DialogTitle>
				<DialogDescription>Every agent is moored to all of them, so a repository added here reaches the whole fleet.</DialogDescription>
			</DialogHeader>
			<ReposList api={props.api} repos={props.repos} />
			<AddRepo api={props.api} />
		</DialogContent>
	</Dialog>
);

export const ReposDialog = (props: { readonly api: ReposApi }) => (
	<Live input={{}} query={props.api.repos.all}>
		{(repos) => <Registry api={props.api} repos={repos} />}
	</Live>
);
