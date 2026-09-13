import { Badge } from "#shadcn/badge.tsx";

type Tone = "attention" | "failed" | "live" | "neutral";

const TONES: Readonly<Record<Tone, string>> = {
	attention: "text-state-attention",
	failed: "text-state-failed",
	live: "text-state-live",
	neutral: "text-muted-foreground",
};

const STATES: Readonly<Record<string, Tone>> = {
	alive: "live",
	asleep: "neutral",
	conflict: "failed",
	failed: "failed",
	held: "attention",
	idle: "neutral",
	interrupted: "failed",
	landed: "live",
	launched: "neutral",
	merged: "live",
	"no open conversation": "neutral",
	open: "neutral",
	preparing: "neutral",
	queued: "neutral",
	quiet: "neutral",
	retired: "neutral",
	waiting: "attention",
	"waiting on you": "attention",
	working: "live",
};

export const StatusBadge = ({ state }: { readonly state: string }) => {
	const tone = STATES[state] ?? "neutral";
	return (
		<Badge className={`lowercase ${TONES[tone]}`} variant="outline">
			{state}
		</Badge>
	);
};
