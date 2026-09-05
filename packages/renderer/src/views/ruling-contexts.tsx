import type { RulingContextView } from "@antumbra/contract";
import { rulingContextAuthorLabel } from "#rulings/labels.ts";
import { MarkdownView } from "#views/markdown-view.tsx";
import { whenLabel } from "#voyages/labels.ts";

export const RulingContexts = ({ contexts }: { readonly contexts: ReadonlyArray<RulingContextView> }) =>
	contexts.length === 0 ? null : (
		<ul className="flex min-w-0 flex-col gap-1.5 border-l border-border pl-2.5">
			{contexts.map((context) => (
				<li className="flex min-w-0 flex-col gap-0.5" key={`${context.at}:${context.body}`}>
					<span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-2xs text-muted-foreground">
						<span className="min-w-0 truncate">{rulingContextAuthorLabel(context)}</span>
						<span className="ml-auto shrink-0 tabular-nums">{whenLabel(context.at)}</span>
					</span>
					<MarkdownView className="text-xs text-muted-foreground" markdown={context.body} />
				</li>
			))}
		</ul>
	);
