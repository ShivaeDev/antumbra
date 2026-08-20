import type { RepoSummary } from "@antumbra/contract";
import { FolderGitIcon } from "lucide-react";
import { Badge } from "#components/ui/badge.tsx";
import { Button } from "#components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogTrigger,
} from "#components/ui/dialog.tsx";
import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog-sections.tsx";
import { ReposList } from "#views/repos.tsx";

export const ReposDialog = ({
	onError,
	repos,
}: {
	readonly onError: (message: string) => void;
	readonly repos: ReadonlyArray<RepoSummary>;
}) => (
	<Dialog>
		<DialogTrigger asChild>
			<Button variant="outline">
				<FolderGitIcon />
				Repositories
				<Badge variant="secondary">{repos.length}</Badge>
			</Button>
		</DialogTrigger>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Repositories</DialogTitle>
				<DialogDescription>
					Every agent is moored to all of them, so a repository added here
					reaches the whole fleet.
				</DialogDescription>
			</DialogHeader>
			<ReposList onError={onError} repos={repos} />
		</DialogContent>
	</Dialog>
);
