import type { RepoSummary } from "@antumbra/contract";
import { useStore } from "@tanstack/react-form";
import { Schema } from "effect";
import { useRequestForm } from "#adapters/form.ts";
import { forgetRepo, registerRepo } from "#adapters/trpc.ts";
import { Badge } from "#components/ui/badge.tsx";
import { Button } from "#components/ui/button.tsx";
import { RequestForm } from "#forms/view.tsx";

const RepoRow = ({ onError, repo }: { readonly onError: (message: string) => void; readonly repo: RepoSummary }) => (
	<div className="flex min-w-0 items-start gap-2 border-b border-border py-2 last:border-b-0">
		<div className="flex min-w-0 flex-1 flex-col gap-0.5">
			<div className="flex min-w-0 items-center gap-1.5">
				<span className="min-w-0 text-xs font-medium wrap-anywhere">{repo.name}</span>
				<Badge variant="outline">{repo.defaultRef}</Badge>
			</div>
			<span className="font-mono text-2xs text-muted-foreground wrap-anywhere">{repo.source}</span>
		</div>
		<Button className="text-muted-foreground" onClick={() => forgetRepo(repo.id, onError)} size="sm" variant="ghost">
			Forget
		</Button>
	</div>
);

const registrationSchema = Schema.Struct({ source: Schema.NonEmptyString, defaultRef: Schema.NonEmptyString });
const AddRepo = () => {
	const form = useRequestForm({
		defaultValues: { source: "", defaultRef: "main" },
		schema: registrationSchema,
		request: registerRepo,
		resetAfterSuccess: (value) => ({ ...value, source: "" }),
		onSuccess: () => undefined,
	});
	const ready = useStore(form.store, (state) => state.values.source !== "" && state.values.defaultRef !== "");
	return (
		<RequestForm form={form}>
			<div className="flex items-end gap-2">
				<div className="min-w-0 flex-1">
					<form.AppField name="source">{(field) => <field.TextField label="Source" placeholder="path or url" />}</form.AppField>
				</div>
				<div className="w-24 shrink-0">
					<form.AppField name="defaultRef">{(field) => <field.TextField label="Default ref" placeholder="main" />}</form.AppField>
				</div>
				<form.Submit disabled={!ready} pending="Adding…" variant="outline">
					Add
				</form.Submit>
			</div>
		</RequestForm>
	);
};

export const ReposList = ({ onError, repos }: { readonly onError: (message: string) => void; readonly repos: ReadonlyArray<RepoSummary> }) => (
	<div className="flex min-w-0 flex-col gap-3">
		{repos.length === 0 ? (
			<span className="text-xs text-muted-foreground">no repositories yet — add one below</span>
		) : (
			<div className="flex max-h-64 min-w-0 flex-col overflow-y-auto">
				{repos.map((repo) => (
					<RepoRow key={repo.id} onError={onError} repo={repo} />
				))}
			</div>
		)}
		<AddRepo />
	</div>
);
