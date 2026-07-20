import { useMutation } from '@tanstack/react-query';
import api from '../lib/axios';

interface UploadAttachmentResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  extension: string;
}

/**
 * Hook to upload a file for assignment attachment.
 * Uses /api/storage/upload-attachment — does NOT create a LearningResource record.
 * Returns { fileUrl, fileName, fileSize, fileType, extension }.
 */
export const useUploadAssignmentFile = () => {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadAttachmentResult> => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/storage/upload-attachment', formData);
      return response.data;
    },
  });
};

/**
 * Utility to format file sizes into human-readable strings.
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Get file type icon class/color based on extension.
 */
export const getFileTypeInfo = (url?: string, fileName?: string): {
  icon: string;
  color: string;
  label: string;
  previewable: boolean;
} => {
  const source = fileName || url || '';
  const ext = source.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'pdf':
      return { icon: 'pdf', color: '#ef4444', label: 'PDF Document', previewable: true };
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return { icon: 'img', color: '#8b5cf6', label: 'Image', previewable: true };
    case 'doc':
    case 'docx':
      return { icon: 'doc', color: '#2563eb', label: 'Word Document', previewable: false };
    case 'ppt':
    case 'pptx':
      return { icon: 'ppt', color: '#f97316', label: 'PowerPoint', previewable: false };
    case 'xls':
    case 'xlsx':
      return { icon: 'xls', color: '#16a34a', label: 'Spreadsheet', previewable: false };
    case 'txt':
    case 'md':
      return { icon: 'txt', color: '#64748b', label: 'Text File', previewable: true };
    case 'zip':
    case 'rar':
    case '7z':
      return { icon: 'zip', color: '#ca8a04', label: 'Archive', previewable: false };
    default:
      return { icon: 'file', color: '#64748b', label: 'File', previewable: false };
  }
};
