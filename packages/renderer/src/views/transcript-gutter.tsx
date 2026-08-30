// why: every entry is labelled in the same narrow column, so the eye reads
// down one edge to find who is speaking and the content keeps a single left
// margin however it is rendered.
export const TranscriptGutter = ({
	children,
	label,
}: {
	readonly children: React.ReactNode;
	readonly label: string;
}) => (
	<div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3">
		<span className="pt-0.5 text-right text-2xs text-muted-foreground">
			{label}
		</span>
		<div className="min-w-0">{children}</div>
	</div>
);
