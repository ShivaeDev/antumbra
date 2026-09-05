import { HOLDS, type HoldKind, type HoldWaiting } from "@antumbra/contract";
import { HoldSwitch } from "#views/hold-switch.tsx";
import { holdWords, mailWords, waitedWords } from "#views/hold-words.ts";

const WaitingRow = ({ held, waiting }: { readonly held: boolean; readonly waiting: HoldWaiting }) => (
	<li className="flex min-w-0 items-baseline gap-2 rounded-md border border-border px-3 py-2">
		<span className="truncate text-xs">{waiting.title}</span>
		{waiting.voyage === null ? null : <span className="truncate text-2xs text-muted-foreground">{waiting.voyage}</span>}
		<span className="ml-auto flex shrink-0 items-baseline gap-2 text-2xs text-muted-foreground tabular-nums">
			{waiting.mail === null ? null : <span>{mailWords(waiting.mail)}</span>}
			<span>{waitedWords(waiting.waitedMillis)}</span>
			{held ? <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-secondary-foreground">held</span> : null}
		</span>
	</li>
);

export const HoldQueueSection = ({
	everything,
	kind,
	onHold,
	own,
	waiting,
}: {
	readonly everything: boolean;
	readonly kind: HoldKind;
	readonly onHold: (held: boolean) => void;
	readonly own: boolean;
	readonly waiting: ReadonlyArray<HoldWaiting>;
}) => {
	const declaration = HOLDS[kind];
	return (
		<section aria-label={declaration.title} className="flex min-w-0 flex-col gap-2 border-b border-border px-4 py-3">
			<div className="flex items-baseline gap-2">
				<h3 className="text-sm">{declaration.title}</h3>
				<span className="text-2xs text-muted-foreground tabular-nums">{waiting.length} waiting</span>
				<div className="ml-auto">
					<HoldSwitch governs={declaration.title} held={own} onHold={onHold} word={holdWords(everything, own)} />
				</div>
			</div>
			<p className="text-2xs text-muted-foreground">{declaration.description}</p>
			{waiting.length === 0 ? (
				<p className="text-2xs text-muted-foreground">{declaration.quiet}</p>
			) : (
				<ul className="flex min-w-0 flex-col gap-1.5">
					{waiting.map((entry) => (
						<WaitingRow held={everything || own} key={entry.id} waiting={entry} />
					))}
				</ul>
			)}
		</section>
	);
};
