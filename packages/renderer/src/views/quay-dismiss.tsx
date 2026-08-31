import { dismissChange } from "#adapters/trpc-quay.ts";
import { Button } from "#components/ui/button.tsx";
import type { QuayChange } from "#quay/changes.ts";

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
