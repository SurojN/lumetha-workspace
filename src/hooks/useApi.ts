import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { Project, Task, Sprint, Board } from "@/types";

// Projects
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await apiClient.get<Project[]>("/projects");
      return data;
    },
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<Project>(`/projects/${projectId}`);
      return data;
    },
    enabled: !!projectId,
  });
}

// Tasks
export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<Task[]>(
        `/projects/${projectId}/tasks`,
      );
      return data;
    },
    enabled: !!projectId,
  });
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const { data } = await apiClient.get<Task>(`/tasks/${taskId}`);
      return data;
    },
    enabled: !!taskId,
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      ...updates
    }: {
      taskId: string;
    } & Partial<Task>) => {
      const { data } = await apiClient.patch<Task>(`/tasks/${taskId}`, updates);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// Boards
export function useProjectBoard(projectId: string, boardId: string) {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const { data } = await apiClient.get<Board>(
        `/projects/${projectId}/boards/${boardId}`,
      );
      return data;
    },
    enabled: !!projectId && !!boardId,
  });
}

// Sprints
export function useProjectSprints(projectId: string) {
  return useQuery({
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<Sprint[]>(
        `/projects/${projectId}/sprints`,
      );
      return data;
    },
    enabled: !!projectId,
  });
}

export function useSprint(sprintId: string) {
  return useQuery({
    queryKey: ["sprint", sprintId],
    queryFn: async () => {
      const { data } = await apiClient.get<Sprint>(`/sprints/${sprintId}`);
      return data;
    },
    enabled: !!sprintId,
  });
}
