import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import type { Department } from '../types';

export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get<Department[]>('/departments');
      return response.data;
    },
  });
};

export const useDepartment = (id: string) => {
  return useQuery({
    queryKey: ['departments', id],
    queryFn: async () => {
      const response = await api.get<Department>(`/departments/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useDepartmentByCode = (code: string) => {
  return useQuery({
    queryKey: ['departments', 'code', code],
    queryFn: async () => {
      const response = await api.get<Department>(`/departments/code/${code}`);
      return response.data;
    },
    enabled: !!code,
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Department>) => {
      const response = await api.post<Department>('/departments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Department> }) => {
      const response = await api.put<Department>(`/departments/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/departments/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};
