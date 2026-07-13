// User Types
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Project Types
export interface Project {
  id: string;
  key: string;
  name: string;
  description: string | null;
  ownerId: string;
  icon: string | null;
  category: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: "owner" | "admin" | "member" | "viewer";
  createdAt: Date;
}

// Board Types
export interface Board {
  id: string;
  projectId: string;
  name: string;
  type: "kanban" | "scrum";
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardColumn {
  id: string;
  boardId: string;
  name: string;
  order: number;
  color: string | null;
}

// Sprint Types
export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  status: "backlog" | "active" | "completed";
  startDate: Date | null;
  endDate: Date | null;
  goal: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Task Types
export type TaskType = "task" | "bug" | "feature" | "improvement";
export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
  id: string;
  projectId: string;
  key: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  boardColumnId: string | null;
  sprintId: string | null;
  creatorId: string;
  assigneeId: string | null;
  storyPoints: number | null;
  dueDate: Date | null;
  order: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWithRelations extends Task {
  creator: User;
  assignee: User | null;
  comments: Comment[];
  subtasks: Subtask[];
  attachments: Attachment[];
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  taskId: string;
  url: string;
  name: string;
  size: number | null;
  type: string | null;
  createdAt: Date;
}

// Activity Types
export interface Activity {
  id: string;
  projectId: string;
  taskId: string | null;
  userId: string;
  user: User;
  action: "created" | "updated" | "commented" | "moved";
  details: string | null;
  createdAt: Date;
}
