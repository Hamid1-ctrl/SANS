import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import type { Quiz } from '../types';

export const useQuizzes = (classId?: string) => {
  return useQuery({
    queryKey: ['quizzes', classId],
    queryFn: async () => {
      const response = await api.get<Quiz[]>('/quizzes', {
        params: classId ? { classId } : {}
      });
      return response.data;
    },
  });
};

export const useCreateQuiz = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { title: string; date: string; points: number; questionsCount: number; classWorkspaceId: string }) => {
      const response = await api.post<Quiz>('/quizzes', data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['quizzes', variables.classWorkspaceId] });
    },
  });
};

export const useDeleteQuiz = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/quizzes/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
};
