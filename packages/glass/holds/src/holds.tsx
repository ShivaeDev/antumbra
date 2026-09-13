import type { HoldQueue } from "@antumbra/domain-holds/queries/queues.ts";
import type { Waiting } from "@antumbra/domain-holds/queries/waiting.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { useId } from "react";
import type { HoldsApi } from "#glass.ts";
import { HoldSwitch } from "#hold-switch.tsx";
import { waitedWords } from "#waited.ts";

const NOTHING = "Nothing is waiting on a switch.";
const EMPTY = "Nothing is waiting yet.";

export const HoldsPanel = ({ api }: { readonly api: HoldsApi }) => (
	<Live query={api.holds.queues} input={{}} waiting="Reading the holds…">
		{(view) => (
			<section className="flex min-h-0 flex-col overflow-y-auto">
				<header className="border-b border-border p-4">
					<div className="flex justify-between">
						<h2>The holds</h2>
						<HoldSwitch
							api={api}
							title="All queues"
							sending={!view.everything}
							held={view.everything}
							toggle={(sending) => ({ key: "holdEverything", on: !sending })}
						/>
					</div>
					<p className="text-xs text-muted-foreground">
						Everything Antumbra sends on its own. A switch off holds its queue: nothing new goes out, nothing already running is touched, and what is
						waiting goes out when the switch comes back on.
					</p>
				</header>
				{view.queues.length === 0 ? <p className="p-4 text-xs text-muted-foreground">{NOTHING}</p> : null}
				{view.queues.map((queue) => (
					<QueueSection api={api} queue={queue} key={queue.setting} />
				))}
			</section>
		)}
	</Live>
);

const WaitingRow = ({ waiting, held }: { readonly waiting: typeof Waiting.Type; readonly held: boolean }) => (
	<li className="flex gap-2 rounded border border-border p-2">
		<span>{waiting.title}</span>
		{waiting.voyage === null ? null : <span>{waiting.voyage}</span>}
		{waiting.mail === null ? null : (
			<span>
				{waiting.mail.count} mail{waiting.mail.precedence === "priority" ? " · priority" : ""}
			</span>
		)}
		{waiting.waitedMillis === null ? null : <span>{waitedWords(waiting.waitedMillis)}</span>}
		{held ? <span>held</span> : null}
	</li>
);

const QueueSection = ({ api, queue }: { readonly api: HoldsApi; readonly queue: typeof HoldQueue.Type }) => {
	const titled = useId();
	return (
		<section aria-labelledby={titled} className="flex flex-col gap-2 border-b border-border p-4">
			<header className="flex justify-between">
				<div className="flex items-baseline gap-2">
					<h3 id={titled}>{queue.title}</h3>
					<span className="text-xs text-muted-foreground">{queue.waiting.length} waiting</span>
				</div>
				<HoldSwitch api={api} title={queue.title} sending={queue.on} held={queue.held} toggle={(sending) => ({ key: queue.setting, on: sending })} />
			</header>
			<p className="text-xs text-muted-foreground">{queue.description}</p>
			{queue.waiting.length === 0 ? (
				<p className="text-xs text-muted-foreground">{EMPTY}</p>
			) : (
				<ul>
					{queue.waiting.map((waiting) => (
						<WaitingRow key={waiting.id} waiting={waiting} held={queue.held} />
					))}
				</ul>
			)}
		</section>
	);
};
