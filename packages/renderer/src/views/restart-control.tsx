import { useState } from "react";
import { restartApp } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";

export const RestartControl = ({ onError }: { readonly onError: (message: string) => void }) => {
	const [confirming, setConfirming] = useState(false);
	return (
		<div className="flex flex-col gap-3 rounded-md border border-border p-4">
			<h3 className="text-sm font-medium">Restart Antumbra</h3>
			{confirming ? (
				<>
					<p className="text-xs text-muted-foreground">Stop running agents, restart, and wake them again</p>
					<div className="flex gap-2">
						<Button onClick={() => restartApp(onError)} size="sm" variant="destructive">
							Restart
						</Button>
						<Button onClick={() => setConfirming(false)} size="sm" variant="outline">
							Keep running
						</Button>
					</div>
				</>
			) : (
				<Button className="self-start" onClick={() => setConfirming(true)} size="sm" variant="outline">
					Restart Antumbra
				</Button>
			)}
		</div>
	);
};
