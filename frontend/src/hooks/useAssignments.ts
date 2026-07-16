import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import type { Assignment, AssignmentSubmission } from '../types';

export const useAssignments = (classId?: string) => {
  return useQuery({
    queryKey: ['assignments', classId],
    queryFn: async () => {
      const response = await api.get<Assignment[]>('/assignments', {
        params: classId ? { classId } : {}
      });
      return response.data;
    },
  });
};

export const useDepartmentAssignments = (departmentId: string) => {
  return useQuery({
    queryKey: ['assignments', 'department', departmentId],
    queryFn: async () => {
      const response = await api.get<Assignment[]>(`/assignments/department/${departmentId}`);
      return response.data;
    },
    enabled: !!departmentId,
  });
};

export const useAssignment = (id: string) => {
  return useQuery({
    queryKey: ['assignments', id],
    queryFn: async () => {
      const response = await api.get<Assignment>(`/assignments/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Assignment>) => {
      const response = await api.post<Assignment>('/assignments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
};

export const useUpdateAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Assignment> }) => {
      const response = await api.put<Assignment>(`/assignments/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
};

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/assignments/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
};

export const useSubmitAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AssignmentSubmission> }) => {
      const response = await api.post<AssignmentSubmission>(`/assignments/${id}/submit`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
};

export const useAssignmentSubmissions = (assignmentId: string) => {
  return useQuery({
    queryKey: ['submissions', assignmentId],
    queryFn: async () => {
      const response = await api.get<AssignmentSubmission[]>(`/assignments/${assignmentId}/submissions`);
      return response.data;
    },
    enabled: !!assignmentId,
  });
};
