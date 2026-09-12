import { CommandAct } from "@antumbra/glass-components/act.tsx";
import type { ChangesApi, QuayChange } from "#glass.ts";

export const QuayPublication = ({ api, item }: { readonly api: ChangesApi; readonly item: QuayChange }) => {
	if (item.publicationError === null) return null;
	return (
		<div className="flex flex-col items-start gap-2">
			<p role="alert" className="text-sm text-destructive">
				{item.publicationError}
			</p>
			{item.stage === "prepared" && item.proposalFrozenAt !== null ? (
				<CommandAct
					command={api.changes.freeze}
					input={{
						changeId: item.id,
						title: item.title,
						body: item.body,
						base: item.baseRef,
						draft: item.draftAt !== null,
						at: item.proposalFrozenAt,
					}}
					label="Retry publication"
				/>
			) : null}
		</div>
	);
};
