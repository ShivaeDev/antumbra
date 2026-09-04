import { useState } from "react";
import { restartApp } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";

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

export const RestartControl = ({ onError }: { readonly onError: (message: string) => void }) => {
	const [confirming, setConfirming] = useState(false);
	const [sent, setSent] = useState(false);
	const send = () => {
		setSent(true);
		restartApp(onError);
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
