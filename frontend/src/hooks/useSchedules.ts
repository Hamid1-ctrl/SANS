import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import type { Schedule, TodayScheduleSummary } from '../types';

export const useSchedules = (classId?: string, filters?: { course?: string; day?: number; lecturer?: string; venue?: string; lectureType?: string }) => {
  return useQuery({
    queryKey: ['schedules', classId, filters],
    queryFn: async () => {
      const params: any = {};
      if (classId) params.classId = classId;
      if (filters?.course) params.course = filters.course;
      if (filters?.day) params.day = filters.day;
      if (filters?.lecturer) params.lecturer = filters.lecturer;
      if (filters?.venue) params.venue = filters.venue;
      if (filters?.lectureType && filters.lectureType !== 'All') params.lectureType = filters.lectureType;

      const response = await api.get<Schedule[]>('/schedules', { params });
      return response.data;
    },
  });
};

export const useMasterTimetable = () => {
  return useQuery({
    queryKey: ['schedules', 'master'],
    queryFn: async () => {
      const response = await api.get<Schedule[]>('/schedules/master');
      return response.data;
    },
  });
};

export const useTodaySummary = (classId?: string) => {
  return useQuery({
    queryKey: ['schedules', 'today-summary', classId],
    queryFn: async () => {
      const response = await api.get<TodayScheduleSummary>('/schedules/today-summary', {
        params: classId ? { classId } : {}
      });
      return response.data;
    },
    refetchInterval: 15000, // Refresh every 15 seconds for live countdowns
  });
};

export const useUploadMasterTimetable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post<Schedule>('/schedules/master/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

export const useCalendarEvents = (classId?: string) => {
  return useQuery({
    queryKey: ['calendar', classId],
    queryFn: async () => {
      const response = await api.get<any[]>('/schedules/calendar', {
        params: classId ? { classId } : {}
      });
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

export const useImportMasterSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ masterScheduleId, classWorkspaceId }: { masterScheduleId: string; classWorkspaceId: string }) => {
      const response = await api.post<Schedule>('/schedules/import-master', { masterScheduleId, classWorkspaceId });
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
