import type { Waiting } from "@antumbra/domain-holds/queries/queues.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import type { HoldsApi } from "#glass.ts";
import { HoldSwitch } from "#hold-switch.tsx";
import { waitedWords } from "#waited.ts";
export const HoldsPanel = ({ api }: { readonly api: HoldsApi }) => (
	<Live query={api.holds.queues} input={{}} waiting="Reading the holds…">
		{(view) => (
			<section className="flex min-h-0 flex-col overflow-y-auto">
				<header className="border-b border-border p-4">
					<div className="flex justify-between">
						<h2>The holds</h2>
						<HoldSwitch api={api} setting="holdEverything" title="All queues" held={view.everything} everything={false} />
					</div>
					<p className="text-xs text-muted-foreground">
						Everything Antumbra sends on its own. A switch off holds its queue: nothing new goes out, nothing already running is touched, and what is
						waiting goes out when the switch comes back on.
					</p>
				</header>
				{view.queues.map((queue) => (
					<section key={queue.kind} aria-label={queue.title} className="flex flex-col gap-2 border-b border-border p-4">
						<header className="flex justify-between">
							<h3>
								{queue.title} · {queue.waiting.length} waiting
							</h3>
							<HoldSwitch api={api} setting={queue.setting} title={queue.title} held={queue.own} everything={view.everything} />
						</header>
						<p className="text-xs text-muted-foreground">{queue.description}</p>
						{queue.waiting.length === 0 ? (
							<p>{queue.quiet}</p>
						) : (
							<ul>
								{queue.waiting.map((waiting) => (
									<WaitingRow key={waiting.id} waiting={waiting} held={queue.held} />
								))}
							</ul>
						)}
					</section>
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
		<span>{waitedWords(waiting.waitedMillis)}</span>
		{held ? <span>held</span> : null}
	</li>
);
