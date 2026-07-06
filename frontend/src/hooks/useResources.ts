import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import type { LearningResource } from '../types';

export const useResources = () => {
  return useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      const response = await api.get<LearningResource[]>('/resources');
      return response.data;
    },
  });
};

export const useDepartmentResources = (departmentId: string) => {
  return useQuery({
    queryKey: ['resources', 'department', departmentId],
    queryFn: async () => {
      const response = await api.get<LearningResource[]>(`/resources/department/${departmentId}`);
      return response.data;
    },
    enabled: !!departmentId,
  });
};

export const useResource = (id: string) => {
  return useQuery({
    queryKey: ['resources', id],
    queryFn: async () => {
      const response = await api.get<LearningResource>(`/resources/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateResource = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<LearningResource>) => {
      const response = await api.post<LearningResource>('/resources', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
};

export const useUpdateResource = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LearningResource> }) => {
      const response = await api.put<LearningResource>(`/resources/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
};

export const useDeleteResource = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/resources/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
};
