import type { stoppedLoop } from "@antumbra/domain-supervision/rows/stopped-loop.ts";
import { useCommand } from "@antumbra/glass-client/hooks.ts";
import { StatusBadge } from "@antumbra/glass-components/compositions/status-badge.tsx";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Card, CardContent } from "@antumbra/glass-components/shadcn/card.tsx";
import type { ErrorsApi } from "#glass.ts";
import { StackTrace } from "#stack-trace.tsx";

type Entry = typeof stoppedLoop.Row.Type;

const WHEN = new Intl.DateTimeFormat(undefined, {
	day: "2-digit",
	hour: "2-digit",
	hour12: false,
	minute: "2-digit",
	month: "2-digit",
	second: "2-digit",
});

export const StoppedEntry = ({ api, entry }: { readonly api: ErrorsApi; readonly entry: Entry }) => {
	const resume = useCommand(api.supervision.resumeLoop);
	return (
		<Card>
			<CardContent className="flex flex-col gap-2">
				<div className="flex h-8 items-center gap-2">
					<span className="text-sm font-medium">{entry.loop}</span>
					<StatusBadge state={entry.state} />
					<span className="text-xs text-muted-foreground tabular-nums">{WHEN.format(new Date(entry.at))}</span>
					{entry.state === "stopped" ? (
						<Button className="ml-auto" disabled={resume.pending} onClick={() => resume.run({ loop: entry.loop })} size="sm" variant="ghost">
							Resume
						</Button>
					) : null}
				</div>
				<p className="text-sm wrap-anywhere">{entry.message}</p>
				<StackTrace trace={entry.trace} />
			</CardContent>
		</Card>
	);
};
