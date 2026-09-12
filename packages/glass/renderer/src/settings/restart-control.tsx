import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { Cause, Effect } from "effect";
import { useState } from "react";
import type { Shell } from "#shell.ts";

const RestartActions = ({ onKeep, onSend, sent }: { readonly onKeep: () => void; readonly onSend: () => void; readonly sent: boolean }) => (
	<div className="flex gap-2">
		<Button disabled={sent} onClick={onSend} size="sm" variant="destructive">
			{sent ? "Restarting…" : "Restart"}
		</Button>
		{sent ? null : (
			<Button onClick={onKeep} size="sm" variant="outline">
				Keep running
			</Button>
		)}
	</div>
);

export const RestartControl = ({ onError, shell }: { readonly onError: (message: string) => void; readonly shell: Pick<Shell, "restart"> }) => {
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
		<div className="flex flex-col gap-3 rounded-md border border-border p-4">
			<h3 className="text-sm font-medium">Restart</h3>
			{confirming ? (
				<>
					<p className="text-xs text-muted-foreground">Stop running agents, restart, and wake them again</p>
					<RestartActions onKeep={() => setConfirming(false)} onSend={send} sent={sent} />
				</>
			) : (
				<Button className="self-start" onClick={() => setConfirming(true)} size="sm" variant="outline">
					Restart Antumbra
				</Button>
			)}
		</div>
	);
};
