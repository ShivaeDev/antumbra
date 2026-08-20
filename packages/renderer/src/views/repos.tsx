import type { RepoSummary } from "@antumbra/contract";
import { useState } from "react";
import { forgetRepo, registerRepo } from "#adapters/trpc.ts";
import { Badge } from "#components/ui/badge.tsx";
import { Button } from "#components/ui/button.tsx";
import { Input } from "#components/ui/input.tsx";
import { Field } from "#views/field.tsx";

const RepoRow = ({
	onError,
	repo,
}: {
	readonly onError: (message: string) => void;
	readonly repo: RepoSummary;
}) => (
	<div className="flex min-w-0 items-start gap-2 border-b border-border py-2 last:border-b-0">
		<div className="flex min-w-0 flex-1 flex-col gap-0.5">
			<div className="flex min-w-0 items-center gap-1.5">
				<span className="min-w-0 text-xs font-medium wrap-anywhere">
					{repo.name}
				</span>
				<Badge variant="outline">{repo.defaultRef}</Badge>
			</div>
			<span className="font-mono text-2xs text-muted-foreground wrap-anywhere">
				{repo.source}
			</span>
		</div>
		<Button
			className="text-muted-foreground"
			onClick={() => forgetRepo(repo.id, onError)}
			size="sm"
			variant="ghost"
		>
			Forget
		</Button>
	</div>
);

const AddRepo = ({
	onError,
}: {
	readonly onError: (message: string) => void;
}) => {
	const [source, setSource] = useState("");
	const [defaultRef, setDefaultRef] = useState("main");
	const ready = source !== "" && defaultRef !== "";
	const add = () =>
		registerRepo({ defaultRef, source }, () => setSource(""), onError);
	return (
		<div className="flex items-end gap-2">
			<div className="min-w-0 flex-1">
				<Field label="Source">
					<Input
						aria-label="Source"
						onChange={(event) => setSource(event.target.value)}
						placeholder="path or url"
						value={source}
					/>
				</Field>
			</div>
			<div className="w-24 shrink-0">
				<Field label="Default ref">
					<Input
						aria-label="Default ref"
						onChange={(event) => setDefaultRef(event.target.value)}
						placeholder="main"
						value={defaultRef}
					/>
				</Field>
			</div>
			<Button disabled={!ready} onClick={add} variant="outline">
				Add
			</Button>
		</div>
	);
};

export const ReposList = ({
	onError,
	repos,
}: {
	readonly onError: (message: string) => void;
	readonly repos: ReadonlyArray<RepoSummary>;
}) => (
	<div className="flex min-w-0 flex-col gap-3">
		{repos.length === 0 ? (
			<span className="text-xs text-muted-foreground">
				no repositories yet — add one below
			</span>
		) : (
			<div className="flex max-h-64 min-w-0 flex-col overflow-y-auto">
				{repos.map((repo) => (
					<RepoRow key={repo.id} onError={onError} repo={repo} />
				))}
			</div>
		)}
		<AddRepo onError={onError} />
	</div>
);
