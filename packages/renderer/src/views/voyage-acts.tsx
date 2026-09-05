import type { VoyageCaptainView, VoyageSummary } from "@antumbra/contract";
import { PinIcon } from "lucide-react";
import { focusVoyage, hailCaptain } from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { cn } from "#lib/utils.ts";
import { captainAtWork } from "#voyages/acts.ts";
import { captainCallLabel } from "#voyages/labels.ts";

export const FocusToggle = ({ onError, voyage }: { readonly onError: (message: string) => void; readonly voyage: VoyageSummary }) => {
	const focused = voyage.focusedAt !== null;
	const label = focused ? "Drop focus" : "Focus this voyage";
	return (
		<Button
			aria-label={label}
			aria-pressed={focused}
			className="shrink-0"
			onClick={() => focusVoyage(voyage.id, !focused, onError)}
			size="icon"
			title={label}
			type="button"
			variant="ghost"
		>
			<PinIcon className={cn(focused ? "fill-current text-foreground" : "text-muted-foreground")} />
		</Button>
	);
};

export const CaptainCall = ({
	captain,
	onError,
	voyageId,
}: {
	readonly captain: VoyageCaptainView | null;
	readonly onError: (message: string) => void;
	readonly voyageId: string;
}) => {
	if (!captainAtWork(captain)) {
		return (
			<Button onClick={() => hailCaptain(voyageId, onError)} size="sm" type="button" variant="outline">
				{captainCallLabel(captain)}
			</Button>
		);
	}
	return (
		<span className="flex min-w-0 items-center gap-1.5 text-2xs text-muted-foreground">
			<span className="shrink-0">Captain</span>
			<span className="truncate font-mono">{captain.agentId.slice(0, 8)}</span>
			<span className="shrink-0">· {captain.status}</span>
		</span>
	);
};
