import { SettingsRow } from "@antumbra/glass-components/compositions/settings-row.tsx";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@antumbra/glass-components/shadcn/card.tsx";
import { Cause, Effect } from "effect";
import { useId, useState } from "react";
import type { Shell } from "#shell.ts";

const HELP = "Stops running agents and wakes them again once Antumbra is back.";

const RestartActions = ({
	confirming,
	onAsk,
	onKeep,
	onSend,
	sent,
}: {
	readonly confirming: boolean;
	readonly onAsk: () => void;
	readonly onKeep: () => void;
	readonly onSend: () => void;
	readonly sent: boolean;
}) => {
	if (sent) {
		return (
			<Button disabled size="sm" variant="ghost">
				Restarting…
			</Button>
		);
	}
	if (!confirming) {
		return (
			<Button onClick={onAsk} size="sm" variant="outline">
				Restart
			</Button>
		);
	}
	return (
		<div className="flex items-center gap-2">
			<Button onClick={onKeep} size="sm" variant="ghost">
				Keep running
			</Button>
			<Button onClick={onSend} size="sm" variant="outline">
				Restart now
			</Button>
		</div>
	);
};

export const RestartControl = ({ onError, shell }: { readonly onError: (message: string) => void; readonly shell: Pick<Shell, "restart"> }) => {
	const named = useId();
	const [confirming, setConfirming] = useState(false);
	const [sent, setSent] = useState(false);
	const send = () => {
		setSent(true);
		Effect.runFork(
			shell.restart.pipe(
				Effect.catchCause((cause) =>
					Effect.sync(() => {
						setSent(false);
						onError(Cause.pretty(cause));
					}),
				),
			),
		);
	};
	return (
		<Card className="max-w-[720px]">
			<CardHeader>
				<CardTitle className="text-sm font-medium">Restart</CardTitle>
			</CardHeader>
			<CardContent>
				<SettingsRow
					control={
						<RestartActions confirming={confirming} onAsk={() => setConfirming(true)} onKeep={() => setConfirming(false)} onSend={send} sent={sent} />
					}
					help={HELP}
					label="Restart Antumbra"
					labelId={named}
				/>
			</CardContent>
		</Card>
	);
};
