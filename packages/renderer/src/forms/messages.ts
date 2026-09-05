export const errorMessage = (error: unknown): string => {
	if (Array.isArray(error)) return error.map(errorMessage).join(". ");
	if (typeof error === "object" && error !== null) {
		if ("message" in error) return String(error.message);
		return Object.values(error).map(errorMessage).join(". ");
	}
	return String(error);
};
