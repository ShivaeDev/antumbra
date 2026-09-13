import type { HoldQueue, QuietVoyage } from "@antumbra/domain-holds/queries/queues.ts";
import type { Waiting } from "@antumbra/domain-holds/queries/waiting.ts";
import { useCommand } from "@antumbra/glass-client/hooks.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { HeldReading } from "@antumbra/glass-components/compositions/held-reading.tsx";
import { messageOf } from "@antumbra/glass-components/refusal.ts";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useId } from "react";
import type { HoldsApi } from "#glass.ts";
import { HoldSwitch } from "#hold-switch.tsx";
import { waitedWords } from "#waited.ts";

const NOTHING = "Nothing is waiting on a switch.";
const EMPTY = "Nothing is waiting yet.";
const QUIET = "Nothing is sent to this voyage until you resume it. What it is holding goes out then.";

export const HoldsPanel = ({ api }: { readonly api: HoldsApi }) => (
	<Live query={api.holds.queues} input={{}} waiting="Reading the holds…">
		{(view) => (
			<HeldReading className="flex min-h-0 flex-col overflow-y-auto">
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
				{view.queues.length === 0 && view.quieted.length === 0 ? <p className="p-4 text-xs text-muted-foreground">{NOTHING}</p> : null}
				{view.quieted.map((quieted) => (
					<QuietSection api={api} key={quieted.id} quieted={quieted} />
				))}
				{view.queues.map((queue) => (
					<QueueSection api={api} queue={queue} key={queue.setting} />
				))}
			</HeldReading>
		)}
	</Live>
);

const WaitingRow = ({ waiting, held, named }: { readonly waiting: typeof Waiting.Type; readonly held: boolean; readonly named: boolean }) => (
	<li className="flex gap-2 rounded border border-border p-2">
		<span>{waiting.title}</span>
		{named && waiting.voyage !== null ? <span>{waiting.voyage}</span> : null}
		{waiting.mail === null ? null : (
			<span>
				{waiting.mail.count} mail{waiting.mail.precedence === "priority" ? " · priority" : ""}
			</span>
		)}
		{waiting.waitedMillis === null ? null : <span>{waitedWords(waiting.waitedMillis)}</span>}
		{held ? <span>held</span> : null}
	</li>
);

const WaitingList = ({
	held,
	named,
	waiting,
}: {
	readonly held: boolean;
	readonly named: boolean;
	readonly waiting: ReadonlyArray<typeof Waiting.Type>;
}) =>
	waiting.length === 0 ? (
		<p className="text-xs text-muted-foreground">{EMPTY}</p>
	) : (
		<ul>
			{waiting.map((entry) => (
				<WaitingRow held={held} key={entry.id} named={named} waiting={entry} />
			))}
		</ul>
	);

const Resume = ({ api, voyage }: { readonly api: HoldsApi; readonly voyage: typeof QuietVoyage.Type }) => {
	const action = useCommand(api.voyages.resume);
	return (
		<span className="flex items-center gap-2">
			<Button disabled={action.pending} onClick={() => action.run({ id: voyage.id })} size="sm" variant="outline">
				Resume
			</Button>
			{AsyncResult.isFailure(action.result) ? <span role="alert">{messageOf(action.result.cause)}</span> : null}
		</span>
	);
};

const QuietSection = ({ api, quieted }: { readonly api: HoldsApi; readonly quieted: typeof QuietVoyage.Type }) => {
	const titled = useId();
	return (
		<section aria-labelledby={titled} className="flex flex-col gap-2 border-b border-border p-4">
			<header className="flex justify-between">
				<div className="flex items-baseline gap-2">
					<h3 id={titled}>{quieted.name}</h3>
					<span className="text-xs text-muted-foreground">{quieted.waiting.length} waiting</span>
				</div>
				<Resume api={api} voyage={quieted} />
			</header>
			<p className="text-xs text-muted-foreground">{QUIET}</p>
			<WaitingList held named={false} waiting={quieted.waiting} />
		</section>
	);
};

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
			<WaitingList held={queue.held} named waiting={queue.waiting} />
		</section>
	);
};
