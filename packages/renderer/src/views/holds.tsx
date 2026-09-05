import { HOLD_KINDS, HOLDS, type HoldsView, type SettingKey, type SettingsReading } from "@antumbra/contract";
import { Effect } from "effect";
import { watchHolds } from "#adapters/trpc-holds.ts";
import { changeSetting } from "#adapters/trpc-settings.ts";
import { useFeed } from "#hooks/feed.ts";
import { HoldQueueSection } from "#views/hold-queue.tsx";
import { HoldSwitch } from "#views/hold-switch.tsx";
import { holdWords } from "#views/hold-words.ts";

const Header = ({ everything, onHold }: { readonly everything: boolean; readonly onHold: (held: boolean) => void }) => (
	<header className="flex shrink-0 flex-col gap-1 border-b border-border px-4 py-3">
		<div className="flex items-baseline gap-2">
			<h2 className="text-base">The holds</h2>
			<div className="ml-auto">
				<HoldSwitch governs="All queues" held={everything} onHold={onHold} word={holdWords(everything, false)} />
			</div>
		</div>
		<p className="text-2xs text-muted-foreground">
			Everything Antumbra sends on its own. A switch off holds its queue: nothing new goes out, nothing already running is touched, and what is
			waiting goes out when the switch comes back on.
		</p>
	</header>
);

const Queues = ({
	holds,
	onHold,
	settings,
}: {
	readonly holds: HoldsView;
	readonly onHold: (key: SettingKey, held: boolean) => void;
	readonly settings: SettingsReading;
}) => (
	<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
		{HOLD_KINDS.map((kind) => (
			<HoldQueueSection
				everything={settings.settings.holdEverything}
				key={kind}
				kind={kind}
				onHold={(held) => onHold(HOLDS[kind].setting, held)}
				own={settings.settings[HOLDS[kind].setting] === true}
				waiting={holds.queues.find((queue) => queue.kind === kind)?.waiting ?? []}
			/>
		))}
	</div>
);

export const HoldsPanel = ({
	onError,
	onSettings,
	settings,
}: {
	readonly onError: (message: string) => void;
	readonly onSettings: (settings: SettingsReading) => void;
	readonly settings: SettingsReading | undefined;
}) => {
	const { error: feedError, value: holds } = useFeed("holds", watchHolds);
	const onHold = (key: SettingKey, held: boolean) =>
		Effect.runFork(
			changeSetting({ key, value: held }).pipe(
				Effect.match({
					onSuccess: onSettings,
					onFailure: (error) => onError(error.message),
				}),
			),
		);

	return (
		<section className="flex min-h-0 min-w-0 flex-1 flex-col bg-background font-sans text-foreground">
			<Header everything={settings?.settings.holdEverything ?? false} onHold={(held) => onHold("holdEverything", held)} />
			{feedError === undefined ? null : (
				<p className="border-b border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs text-destructive" role="alert">
					feed lost: {feedError}
				</p>
			)}
			{holds === undefined || settings === undefined ? (
				<p aria-live="polite" className="m-auto text-xs text-muted-foreground">
					taking a sight…
				</p>
			) : (
				<Queues holds={holds} onHold={onHold} settings={settings} />
			)}
		</section>
	);
};
