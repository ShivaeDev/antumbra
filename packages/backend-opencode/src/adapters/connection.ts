export interface OpencodeEventListeners {
	readonly onFrame: (frame: unknown) => void;
	readonly onMalformed: (line: string) => void;
}

export interface OpencodeRequest {
	readonly body: unknown;
	readonly path: string;
	readonly query: Readonly<Record<string, string>>;
}

export interface OpencodeConnection {
	readonly close: () => void;
	readonly get: (request: OpencodeRequest) => Promise<unknown>;
	readonly onEvent: (listeners: OpencodeEventListeners) => void;
	readonly onExit: (listener: () => void) => void;
	readonly post: (request: OpencodeRequest) => Promise<unknown>;
}
