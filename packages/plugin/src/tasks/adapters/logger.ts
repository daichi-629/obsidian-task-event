import type { TaskChangeHandler } from "../pipeline";

export function createLoggerHandler(): TaskChangeHandler {
	return (changes) => {
		console.debug("[tasks-event] status-changes", changes);
	};
}
