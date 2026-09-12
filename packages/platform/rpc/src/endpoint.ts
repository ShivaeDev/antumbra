export const path = "/rpc";

export const loopback = (port: number): string => `ws://127.0.0.1:${port}${path}`;
