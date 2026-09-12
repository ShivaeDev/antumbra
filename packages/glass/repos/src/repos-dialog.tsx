import type { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { ACT, NOTE } from "@antumbra/glass-components/classes.ts";
import { useId, useRef } from "react";
import { AddRepo } from "#add-repo.tsx";
import type { ReposApi } from "#glass.ts";
import { ReposList } from "#repos-list.tsx";

const Registry = (props: { readonly api: ReposApi; readonly repos: readonly (typeof repo.Row.Type)[] }) => {
	const dialog = useRef<HTMLDialogElement>(null);
	const title = useId();
	const description = useId();
	return (
		<>
			<button className={ACT} onClick={() => dialog.current?.showModal()} type="button">
				Repositories <span>{props.repos.length}</span>
			</button>
			<dialog
				aria-describedby={description}
				aria-labelledby={title}
				className="m-auto w-full max-w-lg rounded-lg border border-border bg-background p-4 text-foreground shadow-lg backdrop:bg-black/50"
				ref={dialog}
			>
				<div className="flex items-center justify-between gap-2">
					<h2 id={title}>Repositories</h2>
					<button aria-label="Close repositories" className={ACT} onClick={() => dialog.current?.close()} type="button">
						Close
					</button>
				</div>
				<p className={NOTE} id={description}>
					Every agent is moored to all of them, so a repository added here reaches the whole fleet.
				</p>
				<ReposList api={props.api} repos={props.repos} />
				<AddRepo api={props.api} />
			</dialog>
		</>
	);
};

export const ReposDialog = (props: { readonly api: ReposApi }) => (
	<Live input={{}} query={props.api.repos.all}>
		{(repos) => <Registry api={props.api} repos={repos} />}
	</Live>
);
