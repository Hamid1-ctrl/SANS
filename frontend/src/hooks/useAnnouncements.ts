import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import type { Announcement } from '../types';

export const useAnnouncements = () => {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const response = await api.get<Announcement[]>('/announcements');
      return response.data;
    },
  });
};

export const useGlobalAnnouncements = () => {
  return useQuery({
    queryKey: ['announcements', 'global'],
    queryFn: async () => {
      const response = await api.get<Announcement[]>('/announcements/global');
      return response.data;
    },
  });
};

export const useDepartmentAnnouncements = (departmentId: string) => {
  return useQuery({
    queryKey: ['announcements', 'department', departmentId],
    queryFn: async () => {
      const response = await api.get<Announcement[]>(`/announcements/department/${departmentId}`);
      return response.data;
    },
    enabled: !!departmentId,
  });
};

export const useAnnouncement = (id: string) => {
  return useQuery({
    queryKey: ['announcements', id],
    queryFn: async () => {
      const response = await api.get<Announcement>(`/announcements/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Announcement>) => {
      const response = await api.post<Announcement>('/announcements', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Announcement> }) => {
      const response = await api.put<Announcement>(`/announcements/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/announcements/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};
