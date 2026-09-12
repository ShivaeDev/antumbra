import { useState } from "react";

const LINES = 40;

const heldLabel = (held: number): string => (held === 1 ? "Show 1 more line" : `Show ${held} more lines`);

export const Payload = ({ label, text }: { readonly label: string; readonly text: string }) => {
	const [whole, setWhole] = useState(false);
	const lines = text.split("\n");
	const held = whole ? 0 : lines.length - LINES;
	return (
		<div className="min-w-0">
			<div className="text-2xs text-muted-foreground">{label}</div>
			<pre className="max-h-72 overflow-auto whitespace-pre-wrap wrap-anywhere font-mono text-2xs">
				{held > 0 ? lines.slice(0, LINES).join("\n") : text}
			</pre>
			{held > 0 ? (
				<button className="text-2xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setWhole(true)} type="button">
					{heldLabel(held)}
				</button>
			) : null}
		</div>
	);
};
