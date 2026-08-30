import type { SessionInputId } from "@antumbra/contract";
import { useEffect, useState } from "react";
import { loadSessionImage } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";

export const TranscriptImage = ({
	inputId,
	position,
	sessionId,
}: {
	readonly inputId: SessionInputId | undefined;
	readonly position: number;
	readonly sessionId: string;
}) => {
	const [attempt, setAttempt] = useState(0);
	const [error, setError] = useState<string>();
	const [image, setImage] = useState<{
		readonly name: string;
		readonly url: string;
	}>();
	useEffect(() => {
		if (inputId === undefined) return;
		let current = true;
		setError(undefined);
		loadSessionImage(
			{ inputId, position, sessionId },
			(result) => {
				if (!current) return;
				const bytes = result.bytes.slice().buffer;
				setImage({
					name: result.name,
					url: URL.createObjectURL(new Blob([bytes], { type: result.mediaType })),
				});
			},
			(message) => {
				if (current) setError(message);
			},
		);
		return () => {
			current = false;
		};
	}, [attempt, inputId, position, sessionId]);
	useEffect(
		() => () => {
			if (image !== undefined) URL.revokeObjectURL(image.url);
		},
		[image],
	);
	if (inputId === undefined) {
		return <span className="text-2xs text-muted-foreground">attached image unavailable from this older transcript</span>;
	}
	if (error !== undefined) {
		return (
			<div className="rounded-md border border-destructive/40 p-2 text-2xs text-destructive">
				<p>image unavailable: {error}</p>
				<Button onClick={() => setAttempt((value) => value + 1)} size="sm" type="button" variant="outline">
					Retry image
				</Button>
			</div>
		);
	}
	return image === undefined ? (
		<div aria-label={`Loading attached image ${position + 1}`} className="h-24 animate-pulse rounded-md bg-muted" role="status" />
	) : (
		<img
			alt={`Attachment ${position + 1}: ${image.name}`}
			className="max-h-72 max-w-full rounded-md border border-border object-contain"
			src={image.url}
		/>
	);
};
