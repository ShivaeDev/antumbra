import { SettingsRow } from "@antumbra/glass-components/compositions/settings-row.tsx";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@antumbra/glass-components/shadcn/card.tsx";
import { Cause, Effect } from "effect";
import { useId, useState } from "react";

export const RebuildControl = ({
	rebuild,
	onError,
}: {
	readonly rebuild: Effect.Effect<void, unknown>;
	readonly onError: (message: string) => void;
}) => {
	const label = useId();
	const [status, setStatus] = useState<"ready" | "rebuilding" | "rebuilt">("ready");
	const run = () => {
		setStatus("rebuilding");
		Effect.runFork(
			rebuild.pipe(
				Effect.matchCause({
					onSuccess: () => setStatus("rebuilt"),
					onFailure: (cause) => {
						setStatus("ready");
						onError(Cause.pretty(cause));
					},
				}),
			),
		);
	};
	return (
		<Card className="max-w-[720px]">
			<CardHeader>
				<CardTitle className="text-sm font-medium">Debug</CardTitle>
			</CardHeader>
			<CardContent>
				<SettingsRow
					label="Rebuild projections"
					labelId={label}
					help="Recreate the displayed state from the journal. Running agents continue."
					control={
						<Button aria-label="Rebuild projections" disabled={status === "rebuilding"} onClick={run} size="sm" variant="outline">
							{status === "rebuilding" ? "Rebuilding…" : "Rebuild"}
						</Button>
					}
				/>
				{status === "rebuilt" && (
					<p className="text-xs text-muted-foreground" role="status">
						Projections rebuilt.
					</p>
				)}
			</CardContent>
		</Card>
	);
};
