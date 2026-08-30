import { XIcon } from "lucide-react";
import { Button } from "#components/ui/button.tsx";

const line = "flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive";

// why: a feed failure is terminal for that subscription, so its line has no
// dismissal — it stands until the window is reloaded. An act that failed is
// news the reader has now read, and that line goes away.
export const NoticeBar = ({
	feedErrors,
	notice,
	onDismiss,
}: {
	readonly feedErrors: ReadonlyArray<string>;
	readonly notice: string | undefined;
	readonly onDismiss: () => void;
}) =>
	notice === undefined && feedErrors.length === 0 ? null : (
		<div className="flex flex-col gap-1 border-b border-border px-4 py-2">
			{notice === undefined ? null : (
				<div className={line}>
					<span className="min-w-0 flex-1 wrap-anywhere">{notice}</span>
					<Button aria-label="Dismiss" className="-my-0.5 size-5 text-destructive" onClick={onDismiss} size="icon" variant="ghost">
						<XIcon />
					</Button>
				</div>
			)}
			{feedErrors.map((message) => (
				<div className={line} key={message}>
					<span className="min-w-0 flex-1 wrap-anywhere">feed lost: {message}</span>
				</div>
			))}
		</div>
	);
