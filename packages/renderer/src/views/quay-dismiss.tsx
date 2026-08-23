import type { QuayRow } from "@antumbra/contract";
import { dismissChange } from "#adapters/trpc-quay.ts";
import { Button } from "#components/ui/button.tsx";

// why: a change closed without merging is the one thing at the quay no host
// will ever settle for us, so it carries the only verb that can settle it. A
// dead change with no verb beside it is exactly the dead end this button
// exists to end — it is offered on the card rather than behind a menu.
export const QuayDismiss = ({
	onError,
	row,
}: {
	readonly onError: (message: string) => void;
	readonly row: QuayRow;
}) => {
	if (row.change.stage !== "withdrawn") {
		return null;
	}
	return (
		<Button
			className="h-auto px-1 py-0 text-2xs"
			onClick={() => dismissChange(row.change.id, onError)}
			size="sm"
			title="Settle this closed change and take it off the quay"
			type="button"
			variant="outline"
		>
			Dismiss
		</Button>
	);
};
