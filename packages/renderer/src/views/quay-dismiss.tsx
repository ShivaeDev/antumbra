import { dismissChange } from "#adapters/trpc-quay.ts";
import { Button } from "#components/ui/button.tsx";
import type { QuayChange } from "#quay/changes.ts";

// why: a change closed without merging is the one thing at the quay no host
// will ever settle for us, so it carries the only verb that can settle it. It
// stands where the pull request link stands, because on a dead change that is
// the act left to take — and a dead change with no verb beside it is exactly
// the dead end this button exists to end.
export const QuayDismiss = ({ item, onError }: { readonly item: QuayChange; readonly onError: (message: string) => void }) => {
	if (item.change.stage !== "withdrawn") {
		return null;
	}
	return (
		<Button
			onClick={() => dismissChange(item.change.id, onError)}
			title="Settle this closed pull request and take it off the quay"
			type="button"
			variant="outline"
		>
			Dismiss
		</Button>
	);
};
