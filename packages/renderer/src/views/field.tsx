// why: a field's label is a caption above its control rather than a label
// element wrapping it, because some of the controls here are composed widgets
// that already own the click a label would steal.
export const Field = ({
	children,
	label,
}: {
	readonly children: React.ReactNode;
	readonly label: string;
}) => (
	<div className="flex min-w-0 flex-col gap-1">
		<span className="text-2xs text-muted-foreground">{label}</span>
		{children}
	</div>
);
