export const UserRole = {
  Student: 0,
  Lecturer: 1,
  ClassRepresentative: 2,
  Administrator: 3,
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AssignmentStatus = {
  Draft: 0,
  Published: 1,
  Submitted: 2,
  Graded: 3,
  Overdue: 4,
} as const;

export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const NotificationType = {
  Announcement: 0,
  Assignment: 1,
  Exam: 2,
  Resource: 3,
  Message: 4,
  Alert: 5,
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationPriority = {
  Low: 0,
  Normal: 1,
  High: 2,
  Urgent: 3,
} as const;

export type NotificationPriority = (typeof NotificationPriority)[keyof typeof NotificationPriority];

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  studentId: string;
  role: UserRole;
  departmentId?: string;
  isActive: boolean;
  lastLoginAt?: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  isGlobal: boolean;
  departmentId?: string;
  targetRoleId?: string;
  publishedAt?: string;
  expiresAt?: string;
  isPinned: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: string;
  userId: string;
  announcementId?: string;
  assignmentId?: string;
  actionUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  dueDate: string;
  publishedAt?: string;
  maxPoints: number;
  status: AssignmentStatus;
  allowLateSubmission: boolean;
  lateSubmissionPenalty?: number;
  departmentId: string;
  createdById: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  content?: string;
  attachmentUrl?: string;
  grade?: number;
  feedback?: string;
  gradedAt?: string;
  gradedById?: string;
  isLateSubmission: boolean;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface LearningResource {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  tags: string;
  departmentId: string;
  uploadedById: string;
  downloadCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  channelId?: string;
  isRead: boolean;
  readAt?: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  isGroup: boolean;
  departmentId: string;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Schedule {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  room: string;
  departmentId: string;
  isRecurring: boolean;
  recurrencePattern?: string;
  instructorId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  examDate: string;
  startTime: string;
  endTime: string;
  location: string;
  room: string;
  maxPoints: number;
  departmentId: string;
  createdById: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId: string;
  phoneNumber: string;
  role: UserRole;
}
