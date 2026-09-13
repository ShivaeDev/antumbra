export const KEY = "antumbra:session-pane-width:v1";

export const rememberedPaneWidth = (): number | undefined => {
	try {
		const saved = Number(window.localStorage.getItem(KEY));
		return saved > 0 ? saved : undefined;
	} catch {
		return undefined;
	}
};

export const rememberPaneWidth = (width: number): void => {
	try {
		window.localStorage.setItem(KEY, String(width));
	} catch {
		return;
	}
};
