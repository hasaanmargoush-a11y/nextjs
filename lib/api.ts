const API_BASE = "/api";

class ApiError extends Error {
  fieldErrors?: Record<string, string[]>;
  constructor(
    public status: number,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nouvil_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: "حدث خطأ غير متوقع" }));
    throw new ApiError(res.status, data.message || data.error || "حدث خطأ غير متوقع", data.fieldErrors);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function uploadFile(file: File, retries = 2): Promise<string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const metaRes = await fetch(`${API_BASE}/storage/uploads/request-url`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!metaRes.ok) throw new Error("فشل في الحصول على رابط الرفع");
  const { uploadURL, objectPath } = await metaRes.json();

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error(`فشل رفع الملف (${uploadRes.status})`);
      return objectPath as string;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error("فشل رفع الملف");
      if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr ?? new Error("فشل رفع الملف بعد عدة محاولات");
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export type { ApiError };

export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  address?: string;
  age?: number;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  github?: string;
  points: number;
  level?: string;
  createdAt: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail?: string | null;
  category: string;
  level: string;
  isPaid: boolean;
  price?: number | null;
  instructor?: string;
  instructorId?: number;
  studentsCount?: number;
  enrolledCount?: number;
  rating?: number;
  isPublished?: boolean;
  isFeatured?: boolean;
  duration?: string;
  requirements?: string[];
  whatYouLearn?: string[];
  objectives?: string[];
  courseContents?: string[];
  visibility?: string;
  slug?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt: string;
}

export interface CoursePhaseSummary {
  id: number;
  title: string;
  description?: string | null;
  order: number;
  lessons: {
    id: number;
    title: string;
    duration: string;
    order: number;
    isFree: boolean;
    videoUrl?: string | null;
    videoType?: string | null;
  }[];
  quizzes: {
    id: number;
    title: string;
    isRequired: boolean;
  }[];
}

export interface CoursePhase {
  id: number;
  courseId: number;
  title: string;
  description?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonContentBlock {
  id: number;
  lessonId: number;
  type: "text" | "code" | "image";
  content: string;
  language?: string | null;
  order: number;
}

export interface AdminLesson {
  id: number;
  courseId: number;
  phaseId?: number | null;
  title: string;
  duration: string;
  order: number;
  isFree: boolean;
  videoType?: string | null;
  videoUrl?: string | null;
  videoObjectPath?: string | null;
  content?: string | null;
  contentBlocks?: LessonContentBlock[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizOption {
  id: number;
  questionId: number;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface QuizQuestion {
  id: number;
  quizId: number;
  type: "multiple_choice" | "true_false" | "short_answer";
  question: string;
  explanation?: string | null;
  points: number;
  order: number;
  options: QuizOption[];
}

export interface Quiz {
  id: number;
  courseId: number;
  phaseId?: number | null;
  title: string;
  description?: string | null;
  timeLimit?: number | null;
  passingScore: number;
  isRequired: boolean;
  order: number;
  questions?: QuizQuestion[];
}

export interface Certificate {
  id: number;
  courseId: number;
  phaseId?: number | null;
  title: string;
  description?: string | null;
  type: "course" | "phase";
  logoUrl?: string | null;
  signatureUrl?: string | null;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
}

export interface CourseStructure {
  course: Course;
  phases: CoursePhase[];
  lessons: AdminLesson[];
  quizzes: Quiz[];
  certificates: Certificate[];
}

export interface UserCertificate {
  id: number;
  uniqueCode: string;
  issuedAt: string;
  courseId: number;
  courseTitle: string;
  certTitle: string;
  certDescription?: string | null;
  certType: string;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
}

export interface Lesson {
  id: number;
  courseId: number;
  title: string;
  description?: string;
  videoUrl?: string;
  content?: string;
  duration?: number;
  order: number;
  isFree: boolean;
}

export interface PlatformStats {
  totalStudents: number;
  totalCourses: number;
  totalLessons?: number;
  totalInstructors?: number;
}

export interface FeaturedCourse extends Course {
  lessonsCount: number;
}

export interface ChatMessageUser {
  id: number;
  name: string;
  avatar?: string | null;
  role: string;
}

export interface ChatReactionGroup {
  emoji: string;
  count: number;
  users: number[];
}

export interface ChatMessage {
  id: number;
  courseId: number;
  userId: number;
  content: string;
  type: "text" | "image" | "video" | "file" | "audio";
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  replyToId?: number | null;
  isPinned: boolean;
  isDeleted: boolean;
  deletedForEveryone: boolean;
  createdAt: string;
  updatedAt: string;
  user: ChatMessageUser;
  reactions: ChatReactionGroup[];
  replyTo?: (ChatMessage & { user: { name: string } }) | null;
}

export interface AppNotification {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
