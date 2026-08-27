import type { SessionInput } from "@antumbra/plugin-api";

const ID = "00000000-0000-4000-8000-000000000001";

export const textInput = (text: string): SessionInput => ({
	id: ID,
	parts: [{ text, type: "text" }],
});

export const imageInput = (): SessionInput => ({
	id: ID,
	parts: [
		{
			attachmentId: "attachment-1",
			mediaType: "image/png",
			path: "/custody/reef.png",
			position: 0,
			type: "image",
		},
		{ text: "what is shown?", type: "text" },
	],
});
