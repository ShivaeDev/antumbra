export const RESTART_EXIT_CODE = 75;

export const exitAsksForRestart = (code: number): boolean => code === RESTART_EXIT_CODE;
