export type UserRole = "teacher" | "student";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  classIds: string[];
  createdAt?: any;
}

export interface ClassRoom {
  id: string;
  name: string;
  teacherId: string;
  joinCode: string;
  createdAt?: any;
  studentCount?: number;
}

export type ExamStatus = "draft" | "published" | "closed";
export type ShowAnswersPolicy = "never" | "afterSubmit" | "afterClose";

export interface ExamFile {
  id?: string;
  name: string;
  path: string;
  size: number;
  contentType: string;
  uploadedAt: any;
  downloadUrl?: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  classIds: string[];
  status: ExamStatus;
  durationMin: number | null; // null = không giới hạn
  openAt: any | null;
  closeAt: any | null;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showAnswers: ShowAnswersPolicy;
  questionCount: number;
  totalPoints: number;
  files: ExamFile[];
  createdAt?: any;
  updatedAt?: any;
}

export type QuestionType = "single" | "multiple" | "truefalse" | "short";

export interface QuestionOption {
  id: string; // 'a', 'b', 'c', 'd'...
  text: string;
  imageUrl?: string | null;
}

export interface Question {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  imageUrl?: string | null;
  options: QuestionOption[];
  points: number;
}

export interface ShortAnswerConfig {
  accepted: string[];
  numeric?: boolean;
  tolerance?: number;
}

export type AnswerKeyCorrect =
  | string // single: "b"
  | string[] // multiple: ["a", "c"]
  | Record<string, boolean> // truefalse: { a: true, b: false, c: true, d: true }
  | ShortAnswerConfig;

export interface AnswerKey {
  id: string;
  type: QuestionType;
  correct: AnswerKeyCorrect;
  explanation?: string;
}

export type AttemptStatus = "in_progress" | "submitted" | "expired";

export interface QuestionResultDetail {
  earned: number;
  correct?: AnswerKeyCorrect;
  explanation?: string;
}

export interface Attempt {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  classId: string;
  attemptNo: number;
  status: AttemptStatus;
  startedAt: any;
  deadline: any | null;
  seed: number;
  answers: Record<string, any>;
  submittedAt: any | null;
  score: number | null;
  maxScore: number | null;
  detail: Record<string, QuestionResultDetail> | null;
}

export interface QuestionImportItem {
  type: QuestionType;
  text: string;
  options?: string[];
  answer: any;
  points?: number;
  explanation?: string;
  numeric?: boolean;
  tolerance?: number;
  imageUrl?: string | null;
}
