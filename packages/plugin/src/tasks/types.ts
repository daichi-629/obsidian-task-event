export interface TaskStatusConfiguration {
	symbol?: string;
	type?: string;
	name?: string;
}

export interface TaskStatus {
	configuration?: TaskStatusConfiguration;
}

export interface TaskLocationFile {
	_path?: string;
}

export interface TaskLocation {
	_tasksFile?: TaskLocationFile;
	_lineNumber?: number;
}

export interface TaskItem {
	id?: string;
	description?: string;
	status?: TaskStatus;
	taskLocation?: TaskLocation;
}

export interface TasksPluginCacheUpdatePayload {
	tasks: TaskItem[];
	state: string;
}
