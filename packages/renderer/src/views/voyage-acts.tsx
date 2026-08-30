import { AGENT_BACKEND_TAGS, type VoyageCaptainView, type VoyageSummary } from "@antumbra/contract";
import { PinIcon } from "lucide-react";
import { focusVoyage, hailCaptain, setVoyageBackend } from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { cn } from "#lib/utils.ts";
import { captainAtWork } from "#voyages/acts.ts";
import { captainCallLabel } from "#voyages/labels.ts";

// why: focus is a standing mark on a voyage rather than a thing you read, so
// it is a filled pin you can find at a glance instead of a word that has to be
// read against its opposite.
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

// why: the backend is a standing choice with two settled answers, so both are
// on show with the current one pressed — the switch retargets the spawns the
// voyage has yet to make, never the crew already sailing under it.
export const BackendSwitch = ({ onError, voyage }: { readonly onError: (message: string) => void; readonly voyage: VoyageSummary }) => (
	<fieldset className="flex shrink-0 items-center gap-0.5 rounded-md border border-border p-0.5">
		<legend className="sr-only">Backend</legend>
		{AGENT_BACKEND_TAGS.map((tag) => (
			<Button
				aria-pressed={voyage.backend === tag}
				key={tag}
				onClick={() => setVoyageBackend({ backend: tag, voyageId: voyage.id }, onError)}
				size="sm"
				type="button"
				variant={voyage.backend === tag ? "secondary" : "ghost"}
			>
				{tag}
			</Button>
		))}
	</fieldset>
);

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
