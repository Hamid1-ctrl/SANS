import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import type { Schedule } from '../types';

export const useSchedules = () => {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const response = await api.get<Schedule[]>('/schedules');
      return response.data;
    },
  });
};

export const useDepartmentSchedules = (departmentId: string) => {
  return useQuery({
    queryKey: ['schedules', 'department', departmentId],
    queryFn: async () => {
      const response = await api.get<Schedule[]>(`/schedules/department/${departmentId}`);
      return response.data;
    },
    enabled: !!departmentId,
  });
};

export const useSchedule = (id: string) => {
  return useQuery({
    queryKey: ['schedules', id],
    queryFn: async () => {
      const response = await api.get<Schedule>(`/schedules/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Schedule>) => {
      const response = await api.post<Schedule>('/schedules', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Schedule> }) => {
      const response = await api.put<Schedule>(`/schedules/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/schedules/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};
