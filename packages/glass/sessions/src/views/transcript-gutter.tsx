export const TranscriptGutter = ({ children, label }: { readonly children: React.ReactNode; readonly label?: string | undefined }) => (
	<div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3">
		<span className="pt-0.5 text-right text-xs text-muted-foreground">{label}</span>
		<div className="min-w-0">{children}</div>
	</div>
);
