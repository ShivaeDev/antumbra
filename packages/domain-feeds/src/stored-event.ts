export interface StoredEvent {
	readonly kind: string;
	readonly payload: string;
	readonly seq: number;
	readonly sessionId: string;
}
