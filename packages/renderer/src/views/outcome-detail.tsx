import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "#components/ui/button.tsx";
import { OutcomeMarkdownView } from "#views/outcome-markdown.tsx";
import type { OutcomeDetail, OutcomeRef } from "#views/outcome-read.ts";

export const OutcomeChips = ({
	disabled,
	icon,
	onOpen,
	outcomes,
}: {
	readonly disabled: boolean;
	readonly icon: ReactNode;
	readonly onOpen: (outcome: OutcomeRef) => void;
	readonly outcomes: ReadonlyArray<OutcomeRef>;
}) => (
	<div className="flex min-w-0 flex-wrap gap-1">
		{outcomes.map((outcome) => (
			<Button
				className="max-w-full text-muted-foreground"
				disabled={disabled}
				key={outcome.id}
				onClick={() => onOpen(outcome)}
				size="sm"
				type="button"
				variant="outline"
			>
				{icon}
				<span className="min-w-0 truncate">{outcome.title}</span>
			</Button>
		))}
	</div>
);

// why: an outcome that can be taken somewhere says so beside its own title.
// The pane holds the slot and never learns what goes in it, so an outcome
// with nowhere to go simply passes nothing.
export const OutcomeDetailView = ({
	action,
	detail,
	onClose,
	reading,
}: {
	readonly action?: ReactNode;
	readonly detail: OutcomeDetail;
	readonly onClose: () => void;
	readonly reading: string;
}) => (
	<div className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-popover px-2.5 py-2">
		<div className="flex min-w-0 items-start gap-2">
			<h3 className="min-w-0 flex-1 text-xs font-medium wrap-anywhere">
				{detail.title}
			</h3>
			{detail._tag === "loading" ? null : action}
			{detail._tag === "loading" ? null : (
				<Button
					aria-label="Close"
					onClick={onClose}
					size="icon"
					title="Close"
					type="button"
					variant="ghost"
				>
					<XIcon />
				</Button>
			)}
		</div>
		{detail._tag === "loading" ? (
			<p className="text-2xs text-muted-foreground">{reading}</p>
		) : null}
		{detail._tag === "failed" ? (
			<p className="text-2xs text-destructive wrap-anywhere">
				{detail.message}
			</p>
		) : null}
		{detail._tag === "loaded" ? (
			<OutcomeMarkdownView markdown={detail.markdown} />
		) : null}
	</div>
);
