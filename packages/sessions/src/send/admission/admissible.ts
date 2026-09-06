export const admissible = (
	imageInputBackends: ReadonlySet<string>,
	backend: string,
	parts: ReadonlyArray<{ readonly type: "image" | "text" }>,
): boolean => !parts.some((part) => part.type === "image") || imageInputBackends.has(backend);
