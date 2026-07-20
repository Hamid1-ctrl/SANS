export const UserRole = {
  Student: 0,
  Lecturer: 1,
  ClassRepresentative: 2,
  Administrator: 3,
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AccountStatus = {
  Pending: 0,
  Verified: 1,
  Rejected: 2,
  Suspended: 3,
} as const;

export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

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
  status: AccountStatus;
  departmentId?: string;
  isActive: boolean;
  lastLoginAt?: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt?: string;
  officeNumber?: string;
  officeHours?: string;
  specialization?: string;
  bio?: string;
  departmentName?: string;
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
  classWorkspaceId?: string;
  isVerified?: boolean;
  status?: string;
  tags?: string;
  createdBy?: string;
  priority?: string;   // "Urgent" | "Important" | "General"
  category?: string;   // "General" | "Exam" | "Assignment" | "Event" | "Resource" | "Meeting"
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
  attachmentFileName?: string;  // Original filename for display
  attachmentFileSize?: number;  // File size in bytes for display
  createdAt: string;
  updatedAt?: string;
  classWorkspaceId?: string;
  createdBy?: string;           // Display name of creator
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
  classWorkspaceId?: string;
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
  classWorkspaceId?: string;
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
  officeNumber?: string;
  officeHours?: string;
  specialization?: string;
  firebaseUid?: string;
}

export interface ClassWorkspace {
  id: string;
  name: string;
  code: string;
  description: string;
  lecturerName: string;
  lecturerId?: string;
  hasLecturer?: boolean;
  studentsCount: number;
  courseCode?: string;
  departmentText?: string;
  academicLevel?: string;
  semester?: string;
  createdByUserId?: string;
  createdBy?: string;          // Name of creator (for available classes view)
}

export interface Bookmark {
  id: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  details: {
    title: string;
    description: string;
    publishedAt?: string;
    isVerified?: boolean;
    status?: string;
    tags?: string;
    dueDate?: string;
    maxPoints?: number;
    fileUrl?: string;
    fileType?: string;
    fileSize?: number;
    category?: string;
  };
}

export interface Quiz {
  id: string;
  title: string;
  course: string;
  date: string;
  points: number;
  questionsCount: number;
  classWorkspaceId: string;
}
