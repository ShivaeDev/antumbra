import { useState } from "react";

const LINES = 40;

const heldLabel = (held: number): string => (held === 1 ? "Show 1 more line" : `Show ${held} more lines`);

export const Payload = ({ label, text }: { readonly label: string; readonly text: string }) => {
	const [whole, setWhole] = useState(false);
	const lines = text.split("\n");
	const held = whole ? 0 : lines.length - LINES;
	return (
		<div className="min-w-0">
			<div className="text-xs text-muted-foreground">{label}</div>
			<pre className="max-h-72 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap wrap-anywhere">
				{held > 0 ? lines.slice(0, LINES).join("\n") : text}
			</pre>
			{held > 0 ? (
				<button className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setWhole(true)} type="button">
					{heldLabel(held)}
				</button>
			) : null}
		</div>
	);
};
