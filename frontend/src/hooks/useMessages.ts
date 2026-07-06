import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import type { Message } from '../types';

export const useMessages = () => {
  return useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      const response = await api.get<Message[]>('/messages');
      return response.data;
    },
  });
};

export const useConversation = (userId1: string, userId2: string) => {
  return useQuery({
    queryKey: ['messages', 'conversation', userId1, userId2],
    queryFn: async () => {
      const response = await api.get<Message[]>(`/messages/conversation/${userId1}/${userId2}`);
      return response.data;
    },
    enabled: !!userId1 && !!userId2,
  });
};

export const useMessage = (id: string) => {
  return useQuery({
    queryKey: ['messages', id],
    queryFn: async () => {
      const response = await api.get<Message>(`/messages/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Message>) => {
      const response = await api.post<Message>('/messages', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
};

export const useMarkMessageAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.put<Message>(`/messages/${id}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/messages/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
};
