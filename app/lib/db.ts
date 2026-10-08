import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Exam, Question, AnswerKey, ClassRoom, Attempt } from "./types";

// Dữ liệu mẫu ban đầu cho demo
const INITIAL_CLASSES: ClassRoom[] = [
  {
    id: "demo-class-6i0",
    name: "Lớp 6I0 - Tin học cơ bản",
    teacherId: "demo-teacher-uid",
    joinCode: "6I0ABC",
    studentCount: 32,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-class-7a1",
    name: "Lớp 7A1 - Lập trình C++",
    teacherId: "demo-teacher-uid",
    joinCode: "7A1XYZ",
    studentCount: 28,
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_EXAMS: Exam[] = [
  {
    id: "demo-exam-1",
    title: "Kiểm tra 15 phút: Kiểu dữ liệu và Phép toán C++",
    description: "Đề kiểm tra trắc nghiệm 4 dạng câu hỏi. Thời gian làm bài 15 phút.",
    ownerId: "demo-teacher-uid",
    classIds: ["demo-class-6i0", "demo-class-7a1"],
    status: "published",
    durationMin: 15,
    openAt: null,
    closeAt: null,
    maxAttempts: 2,
    shuffleQuestions: true,
    shuffleOptions: true,
    showAnswers: "afterSubmit",
    questionCount: 4,
    totalPoints: 5,
    files: [
      {
        id: "f-1",
        name: "Huong_dan_on_tap_chuong_1.pdf",
        path: "exams/demo-exam-1/files/sample.pdf",
        size: 1024 * 1024 * 2.5,
        contentType: "application/pdf",
        uploadedAt: new Date().toISOString(),
        downloadUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_QUESTIONS: Record<string, Question[]> = {
  "demo-exam-1": [
    {
      id: "q-1",
      order: 1,
      type: "single",
      text: "Ngôn ngữ nào sau đây là ngôn ngữ biên dịch trước khi chạy chương trình?",
      points: 1,
      options: [
        { id: "a", text: "Python" },
        { id: "b", text: "C++" },
        { id: "c", text: "HTML" },
        { id: "d", text: "PHP" },
      ],
    },
    {
      id: "q-2",
      order: 2,
      type: "multiple",
      text: "Chọn các kiểu dữ liệu số nguyên trong ngôn ngữ lập trình C++:",
      points: 1,
      options: [
        { id: "a", text: "int" },
        { id: "b", text: "float" },
        { id: "c", text: "long long" },
        { id: "d", text: "double" },
      ],
    },
    {
      id: "q-3",
      order: 3,
      type: "truefalse",
      text: "Xét đoạn chương trình tính diện tích hình tròn $S = \\pi r^2$. Các phát biểu sau đúng hay sai?",
      points: 2,
      options: [
        { id: "a", text: "Biến bán kính $r$ phải là số thực dương" },
        { id: "b", text: "Số $\\pi$ có giá trị xấp xỉ 3.14159" },
        { id: "c", text: "Diện tích $S$ có thể nhận giá trị âm" },
        { id: "d", text: "Nếu $r = 1$ thì $S \\approx 3.14$" },
      ],
    },
    {
      id: "q-4",
      order: 4,
      type: "short",
      text: "Kết quả của phép toán lấy phần nguyên $7 / 2$ trong ngôn ngữ C++ là bao nhiêu?",
      points: 1,
      options: [],
    },
  ],
};

const INITIAL_ANSWER_KEYS: Record<string, Record<string, AnswerKey>> = {
  "demo-exam-1": {
    "q-1": {
      id: "q-1",
      type: "single",
      correct: "b",
      explanation: "C++ là ngôn ngữ biên dịch trực tiếp sang mã máy qua trình biên dịch (g++, clang).",
    },
    "q-2": {
      id: "q-2",
      type: "multiple",
      correct: ["a", "c"],
      explanation: "int và long long là kiểu số nguyên; float và double là kiểu số thực.",
    },
    "q-3": {
      id: "q-3",
      type: "truefalse",
      correct: { a: true, b: true, c: false, d: true },
      explanation: "Diện tích hình tròn không thể âm. Các ý khác đều chính xác.",
    },
    "q-4": {
      id: "q-4",
      type: "short",
      correct: { accepted: ["3", "3.0"], numeric: true, tolerance: 0 },
      explanation: "Trong C++, phép chia nguyên 7 / 2 cho kết quả là 3.",
    },
  },
};

// Storage helper cho LocalStorage
const getLocal = <T>(key: string, defaultVal: T): T => {
  if (typeof window === "undefined") return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const setLocal = <T>(key: string, val: T) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
};

// ==================== LỚP HỌC (CLASSES) ====================
export async function getClasses(): Promise<ClassRoom[]> {
  try {
    const snap = await getDocs(collection(db, "classes"));
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom));
    }
  } catch {}
  return getLocal("lms_classes", INITIAL_CLASSES);
}

export async function createClass(name: string, teacherId: string): Promise<ClassRoom> {
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const newClass: ClassRoom = {
    id: `class-${Date.now()}`,
    name,
    teacherId,
    joinCode,
    studentCount: 0,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "classes", newClass.id), newClass);
  } catch {}

  const current = await getClasses();
  const updated = [newClass, ...current];
  setLocal("lms_classes", updated);
  return newClass;
}

// ==================== ĐỀ THI (EXAMS) ====================
export async function getExams(): Promise<Exam[]> {
  try {
    const snap = await getDocs(collection(db, "exams"));
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
    }
  } catch {}
  return getLocal("lms_exams", INITIAL_EXAMS);
}

export async function getExamById(id: string): Promise<Exam | null> {
  try {
    const docSnap = await getDoc(doc(db, "exams", id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Exam;
    }
  } catch {}
  const exams = await getExams();
  return exams.find((e) => e.id === id) || null;
}

export async function saveExam(exam: Partial<Exam>): Promise<Exam> {
  const current = await getExams();
  const isNew = !exam.id;
  const examId = exam.id || `exam-${Date.now()}`;

  const fullExam: Exam = {
    id: examId,
    title: exam.title || "Đề thi mới",
    description: exam.description || "",
    ownerId: exam.ownerId || "demo-teacher-uid",
    classIds: exam.classIds || [],
    status: exam.status || "draft",
    durationMin: exam.durationMin !== undefined ? exam.durationMin : 15,
    openAt: exam.openAt || null,
    closeAt: exam.closeAt || null,
    maxAttempts: exam.maxAttempts || 1,
    shuffleQuestions: Boolean(exam.shuffleQuestions),
    shuffleOptions: Boolean(exam.shuffleOptions),
    showAnswers: exam.showAnswers || "afterSubmit",
    questionCount: exam.questionCount || 0,
    totalPoints: exam.totalPoints || 0,
    files: exam.files || [],
    createdAt: exam.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "exams", examId), fullExam);
  } catch {}

  const updated = isNew
    ? [fullExam, ...current]
    : current.map((e) => (e.id === examId ? fullExam : e));
  setLocal("lms_exams", updated);
  return fullExam;
}

// ==================== CÂU HỎI & ĐÁP ÁN (QUESTIONS & KEYS) ====================
export async function getQuestionsByExamId(examId: string): Promise<Question[]> {
  try {
    const snap = await getDocs(collection(db, "exams", examId, "questions"));
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Question)).sort((a, b) => a.order - b.order);
    }
  } catch {}

  const allQuestions = getLocal("lms_questions", INITIAL_QUESTIONS);
  return allQuestions[examId] || [];
}

export async function getAnswerKeysByExamId(examId: string): Promise<Record<string, AnswerKey>> {
  try {
    const snap = await getDocs(collection(db, "exams", examId, "answerKeys"));
    if (!snap.empty) {
      const res: Record<string, AnswerKey> = {};
      snap.docs.forEach((d) => {
        res[d.id] = { id: d.id, ...d.data() } as AnswerKey;
      });
      return res;
    }
  } catch {}

  const allKeys = getLocal("lms_answer_keys", INITIAL_ANSWER_KEYS);
  return allKeys[examId] || {};
}

export async function saveQuestionItem(
  examId: string,
  question: Partial<Question>,
  correctAnswer: any,
  explanation: string = ""
): Promise<Question> {
  const currentQuestions = await getQuestionsByExamId(examId);
  const qId = question.id || `q-${Date.now()}`;
  const order = question.order || currentQuestions.length + 1;

  const fullQ: Question = {
    id: qId,
    order,
    type: question.type || "single",
    text: question.text || "",
    imageUrl: question.imageUrl || null,
    options: question.options || [],
    points: question.points || 1,
  };

  const keyDoc: AnswerKey = {
    id: qId,
    type: fullQ.type,
    correct: correctAnswer,
    explanation,
  };

  try {
    await setDoc(doc(db, "exams", examId, "questions", qId), fullQ);
    await setDoc(doc(db, "exams", examId, "answerKeys", qId), keyDoc);
  } catch {}

  // Update local
  const allQ = getLocal("lms_questions", INITIAL_QUESTIONS);
  const examQ = allQ[examId] || [];
  const exists = examQ.findIndex((q) => q.id === qId);
  if (exists >= 0) {
    examQ[exists] = fullQ;
  } else {
    examQ.push(fullQ);
  }
  allQ[examId] = examQ;
  setLocal("lms_questions", allQ);

  const allK = getLocal("lms_answer_keys", INITIAL_ANSWER_KEYS);
  if (!allK[examId]) allK[examId] = {};
  allK[examId][qId] = keyDoc;
  setLocal("lms_answer_keys", allK);

  // Cập nhật tổng số câu & điểm cho đề
  const totalPoints = examQ.reduce((acc, q) => acc + (q.points || 1), 0);
  const exam = await getExamById(examId);
  if (exam) {
    await saveExam({
      ...exam,
      questionCount: examQ.length,
      totalPoints,
    });
  }

  return fullQ;
}

export async function deleteQuestionItem(examId: string, qId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "exams", examId, "questions", qId));
    await deleteDoc(doc(db, "exams", examId, "answerKeys", qId));
  } catch {}

  const allQ = getLocal("lms_questions", INITIAL_QUESTIONS);
  if (allQ[examId]) {
    allQ[examId] = allQ[examId].filter((q) => q.id !== qId);
    setLocal("lms_questions", allQ);

    const totalPoints = allQ[examId].reduce((acc, q) => acc + (q.points || 1), 0);
    const exam = await getExamById(examId);
    if (exam) {
      await saveExam({
        ...exam,
        questionCount: allQ[examId].length,
        totalPoints,
      });
    }
  }

  const allK = getLocal("lms_answer_keys", INITIAL_ANSWER_KEYS);
  if (allK[examId]) {
    delete allK[examId][qId];
    setLocal("lms_answer_keys", allK);
  }
}

// ==================== LƯỢT LÀM BÀI (ATTEMPTS) ====================
export async function getAttemptsByExamId(examId: string): Promise<Attempt[]> {
  try {
    const q = query(collection(db, "attempts"), where("examId", "==", examId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Attempt));
    }
  } catch {}

  const all = getLocal<Attempt[]>("lms_attempts", []);
  return all.filter((a) => a.examId === examId);
}

export async function getAttemptById(attemptId: string): Promise<Attempt | null> {
  try {
    const docSnap = await getDoc(doc(db, "attempts", attemptId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Attempt;
    }
  } catch {}

  const all = getLocal<Attempt[]>("lms_attempts", []);
  return all.find((a) => a.id === attemptId) || null;
}

export async function saveAttempt(attempt: Attempt): Promise<void> {
  try {
    await setDoc(doc(db, "attempts", attempt.id), attempt);
  } catch {}

  const all = getLocal<Attempt[]>("lms_attempts", []);
  const idx = all.findIndex((a) => a.id === attempt.id);
  if (idx >= 0) {
    all[idx] = attempt;
  } else {
    all.push(attempt);
  }
  setLocal("lms_attempts", all);
}
