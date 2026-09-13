import type { stoppedLoop } from "@antumbra/domain-supervision/rows/stopped-loop.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { PageHeader } from "@antumbra/glass-components/compositions/page-header.tsx";
import { SectionHeading } from "@antumbra/glass-components/compositions/section-heading.tsx";
import type { ErrorsApi } from "#glass.ts";
import { StoppedEntry } from "#stopped-entry.tsx";

type Entry = typeof stoppedLoop.Row.Type;

const DESCRIPTION = "A loop that stops on an error stays stopped until you resume it here.";

const Stopped = ({ api, entries }: { readonly api: ErrorsApi; readonly entries: readonly Entry[] }) => (
	<SectionHeading count={entries.length} title="Loops that stopped">
		{entries.length === 0 ? (
			<p className="text-xs text-muted-foreground">No loop has stopped.</p>
		) : (
			<div className="flex flex-col gap-3">
				{entries.map((entry) => (
					<StoppedEntry api={api} entry={entry} key={entry.loop} />
				))}
			</div>
		)}
	</SectionHeading>
);

export const ErrorsPanel = ({ api }: { readonly api: ErrorsApi }) => (
	<section className="flex-1 overflow-y-auto px-6 pt-5 pb-10">
		<div className="max-w-[1040px]">
			<PageHeader description={DESCRIPTION} title="Errors" />
			<Live query={api.supervision.stoppedLoops} input={{}} waiting="Reading the loops…">
				{(entries) => <Stopped api={api} entries={entries} />}
			</Live>
		</div>
	</section>
);
