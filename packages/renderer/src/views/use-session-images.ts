import { useEffect, useRef, useState } from "react";
import {
	type DraftImage,
	filesFromClipboard,
	imageFileIssue,
	makeDraftImage,
} from "#views/session-draft.ts";

export const useSessionImages = ({
	canAttach,
	onChange,
	onIssue,
}: {
	readonly canAttach: boolean;
	readonly onChange: () => void;
	readonly onIssue: (issue: string | undefined) => void;
}) => {
	const [announcement, setAnnouncement] = useState("");
	const [images, setImages] = useState<ReadonlyArray<DraftImage>>([]);
	const imagesRef = useRef(images);
	imagesRef.current = images;
	useEffect(
		() => () => {
			for (const image of imagesRef.current) URL.revokeObjectURL(image.url);
		},
		[],
	);
	const addFiles = (files: ReadonlyArray<File>) => {
		if (files.length === 0) return;
		if (!canAttach) {
			onIssue("backend_text_only: this session cannot receive images");
			return;
		}
		const accepted: DraftImage[] = [];
		const issues: string[] = [];
		for (const file of files) {
			const issue = imageFileIssue(file, images.length + accepted.length);
			if (issue === undefined) accepted.push(makeDraftImage(file));
			else issues.push(issue);
		}
		if (accepted.length > 0) {
			onChange();
			setImages([...images, ...accepted]);
		}
		const acceptedWords = `${accepted.length} image${accepted.length === 1 ? "" : "s"} attached`;
		const rejectedWords = `${issues.length} rejected`;
		setAnnouncement(
			issues.length === 0
				? acceptedWords
				: `${acceptedWords}, ${rejectedWords}`,
		);
		onIssue(issues.length === 0 ? undefined : issues.join("; "));
	};
	const remove = (index: number) => {
		const removed = images[index];
		if (removed === undefined) return;
		URL.revokeObjectURL(removed.url);
		onChange();
		setImages(images.filter((_, at) => at !== index));
		setAnnouncement(`${removed.file.name || "image"} removed`);
	};
	const move = (from: number, to: number) => {
		const moved = images[from];
		if (moved === undefined || images[to] === undefined) return;
		const next = [...images];
		next.splice(from, 1);
		next.splice(to, 0, moved);
		onChange();
		setImages(next);
		setAnnouncement(
			`${moved.file.name || "image"} moved to position ${to + 1}`,
		);
	};
	const paste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
		const files = filesFromClipboard(event.clipboardData.items);
		if (files.length === 0) return;
		if (!event.clipboardData.types.includes("text/plain"))
			event.preventDefault();
		addFiles(files);
	};
	const drop = (event: React.DragEvent<HTMLTextAreaElement>) => {
		if (event.dataTransfer.files.length === 0) return;
		event.preventDefault();
		addFiles(Array.from(event.dataTransfer.files));
	};
	const clear = () => {
		for (const image of images) URL.revokeObjectURL(image.url);
		setImages([]);
	};
	return {
		addFiles,
		announce: setAnnouncement,
		announcement,
		clear,
		drop,
		images,
		move,
		paste,
		remove,
	};
};
