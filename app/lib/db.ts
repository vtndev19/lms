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
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db, getFirebaseStorage } from "./firebase";
import type {
  Exam,
  Question,
  AnswerKey,
  ClassRoom,
  Attempt,
  ExamFile,
  QuestionImportItem,
  ExamStatus,
} from "./types";

// ==================== 1. LỚP HỌC PHẦN (CLASSES) ====================

/**
 * Lấy danh sách lớp học từ Firestore
 * @param teacherId Nếu truyền vào, chỉ lấy lớp do giáo viên đó tạo
 */
export async function getClasses(teacherId?: string): Promise<ClassRoom[]> {
  try {
    const classesRef = collection(db, "classes");
    let q = teacherId
      ? query(classesRef, where("teacherId", "==", teacherId))
      : query(classesRef, orderBy("createdAt", "desc"));

    let snap;
    try {
      snap = await getDocs(q);
    } catch {
      // Fallback nếu chưa tạo composite index trên Firestore
      snap = await getDocs(classesRef);
    }

    let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom));
    if (teacherId) {
      list = list.filter((c) => c.teacherId === teacherId);
    }
    return list;
  } catch (err: any) {
    console.error("Lỗi lấy danh sách lớp học từ Firestore:", err);
    return [];
  }
}

/**
 * Lấy chi tiết một lớp học theo ID
 */
export async function getClassById(classId: string): Promise<ClassRoom | null> {
  try {
    const snap = await getDoc(doc(db, "classes", classId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as ClassRoom;
    }
    return null;
  } catch (err) {
    console.error("Lỗi đọc lớp học từ Firestore:", err);
    return null;
  }
}

/**
 * Tạo lớp học mới và lưu vào Firestore
 */
export async function createClass(name: string, teacherId: string): Promise<ClassRoom> {
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const classRef = doc(collection(db, "classes"));

  const newClass: ClassRoom = {
    id: classRef.id,
    name: name.trim(),
    teacherId,
    joinCode,
    studentCount: 0,
    createdAt: new Date().toISOString(),
  };

  await setDoc(classRef, newClass);
  return newClass;
}

/**
 * Xóa một lớp học khỏi Firestore
 */
export async function deleteClass(classId: string): Promise<void> {
  await deleteDoc(doc(db, "classes", classId));
}

/**
 * Học sinh tham gia lớp học bằng mã code (6 ký tự)
 */
export async function joinClassByCode(
  joinCode: string,
  studentId: string,
  studentName: string
): Promise<ClassRoom> {
  const cleanCode = joinCode.trim().toUpperCase();
  const classesRef = collection(db, "classes");
  const q = query(classesRef, where("joinCode", "==", cleanCode));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("Không tìm thấy lớp học nào với mã này. Vui lòng kiểm tra lại với thầy/cô.");
  }

  const classDoc = snap.docs[0];
  const classData = { id: classDoc.id, ...classDoc.data() } as ClassRoom;

  // 1. Cập nhật classIds trong document người dùng
  try {
    const userRef = doc(db, "users", studentId);
    await updateDoc(userRef, {
      classIds: arrayUnion(classData.id),
    });
  } catch {
    // Nếu updateDoc fail vì user doc chưa có, tạo/merge
    await setDoc(
      doc(db, "users", studentId),
      { classIds: arrayUnion(classData.id) },
      { merge: true }
    );
  }

  // 2. Thêm record học sinh vào subcollection `classes/{classId}/students/{studentId}`
  try {
    const studentMembershipRef = doc(db, "classes", classData.id, "students", studentId);
    const membershipSnap = await getDoc(studentMembershipRef);
    if (!membershipSnap.exists()) {
      await setDoc(studentMembershipRef, {
        studentId,
        studentName,
        joinedAt: new Date().toISOString(),
      });

      // Tăng số lượng học sinh trong lớp
      await updateDoc(doc(db, "classes", classData.id), {
        studentCount: increment(1),
      });
      classData.studentCount = (classData.studentCount || 0) + 1;
    }
  } catch (err) {
    console.warn("Lưu membership lớp học:", err);
  }

  return classData;
}

// ==================== 2. ĐỀ THI (EXAMS) ====================

/**
 * Lấy danh sách đề thi từ Firestore
 */
export async function getExams(filter?: {
  ownerId?: string;
  classIds?: string[];
  status?: ExamStatus;
}): Promise<Exam[]> {
  try {
    const examsRef = collection(db, "exams");
    let snap = await getDocs(examsRef);

    let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));

    if (filter?.ownerId) {
      list = list.filter((e) => e.ownerId === filter.ownerId);
    }
    if (filter?.status) {
      list = list.filter((e) => e.status === filter.status);
    }
    if (filter?.classIds && filter.classIds.length > 0) {
      list = list.filter((e) =>
        e.classIds && e.classIds.some((cid) => filter.classIds!.includes(cid))
      );
    }

    // Sắp xếp đề thi mới nhất lên đầu
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return list;
  } catch (err: any) {
    console.error("Lỗi lấy danh sách đề thi từ Firestore:", err);
    return [];
  }
}

/**
 * Lấy chi tiết đề thi theo ID
 */
export async function getExamById(id: string): Promise<Exam | null> {
  try {
    const docSnap = await getDoc(doc(db, "exams", id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Exam;
    }
    return null;
  } catch (err) {
    console.error("Lỗi đọc đề thi từ Firestore:", err);
    return null;
  }
}

/**
 * Tạo mới hoặc cập nhật đề thi trên Firestore
 */
export async function saveExam(exam: Partial<Exam>): Promise<Exam> {
  const isNew = !exam.id;
  const examRef = isNew ? doc(collection(db, "exams")) : doc(db, "exams", exam.id!);
  const examId = examRef.id;

  const fullExam: Exam = {
    id: examId,
    title: exam.title?.trim() || "Đề thi mới",
    description: exam.description?.trim() || "",
    ownerId: exam.ownerId || "",
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

  await setDoc(examRef, fullExam, { merge: true });
  return fullExam;
}

/**
 * Xóa đề thi và tất cả câu hỏi, đáp án trong Firestore
 */
export async function deleteExam(examId: string): Promise<void> {
  try {
    // Xóa subcollection questions và answerKeys
    const [qSnap, kSnap] = await Promise.all([
      getDocs(collection(db, "exams", examId, "questions")),
      getDocs(collection(db, "exams", examId, "answerKeys")),
    ]);

    const batch = writeBatch(db);
    qSnap.docs.forEach((d) => batch.delete(d.ref));
    kSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, "exams", examId));

    await batch.commit();
  } catch (err) {
    console.error("Lỗi xóa đề thi:", err);
    await deleteDoc(doc(db, "exams", examId));
  }
}

// ==================== 3. CÂU HỎI & ĐÁP ÁN (QUESTIONS & ANSWER KEYS) ====================

/**
 * Lấy danh sách câu hỏi của một đề thi từ Firestore
 */
export async function getQuestionsByExamId(examId: string): Promise<Question[]> {
  try {
    const snap = await getDocs(collection(db, "exams", examId, "questions"));
    const questions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
    questions.sort((a, b) => (a.order || 0) - (b.order || 0));
    return questions;
  } catch (err) {
    console.error("Lỗi lấy danh sách câu hỏi:", err);
    return [];
  }
}

/**
 * Lấy bộ đáp án đúng của một đề thi từ Firestore
 */
export async function getAnswerKeysByExamId(examId: string): Promise<Record<string, AnswerKey>> {
  try {
    const snap = await getDocs(collection(db, "exams", examId, "answerKeys"));
    const res: Record<string, AnswerKey> = {};
    snap.docs.forEach((d) => {
      res[d.id] = { id: d.id, ...d.data() } as AnswerKey;
    });
    return res;
  } catch (err) {
    console.error("Lỗi lấy đáp án câu hỏi:", err);
    return {};
  }
}

/**
 * Lưu hoặc cập nhật một câu hỏi và đáp án vào Firestore
 */
export async function saveQuestionItem(
  examId: string,
  question: Partial<Question>,
  correctAnswer: any,
  explanation: string = ""
): Promise<Question> {
  const currentQuestions = await getQuestionsByExamId(examId);
  const qId = question.id || `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const order = question.order || currentQuestions.length + 1;

  const fullQ: Question = {
    id: qId,
    order,
    type: question.type || "single",
    text: question.text?.trim() || "",
    imageUrl: question.imageUrl || null,
    options: question.options || [],
    points: question.points || 1,
  };

  const keyDoc: AnswerKey = {
    id: qId,
    type: fullQ.type,
    correct: correctAnswer,
    explanation: explanation.trim(),
  };

  // Lưu song song câu hỏi và đáp án vào subcollection
  await Promise.all([
    setDoc(doc(db, "exams", examId, "questions", qId), fullQ),
    setDoc(doc(db, "exams", examId, "answerKeys", qId), keyDoc),
  ]);

  // Cập nhật lại tổng số câu hỏi & tổng điểm trên đề thi trong Firestore
  const updatedQuestions = await getQuestionsByExamId(examId);
  const totalPoints = updatedQuestions.reduce((acc, q) => acc + (q.points || 1), 0);
  await updateDoc(doc(db, "exams", examId), {
    questionCount: updatedQuestions.length,
    totalPoints,
    updatedAt: new Date().toISOString(),
  });

  return fullQ;
}

/**
 * Xóa một câu hỏi và đáp án tương ứng khỏi Firestore
 */
export async function deleteQuestionItem(examId: string, qId: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, "exams", examId, "questions", qId)),
    deleteDoc(doc(db, "exams", examId, "answerKeys", qId)),
  ]);

  // Cập nhật lại thống kê trên đề thi
  const remaining = await getQuestionsByExamId(examId);
  const totalPoints = remaining.reduce((acc, q) => acc + (q.points || 1), 0);
  await updateDoc(doc(db, "exams", examId), {
    questionCount: remaining.length,
    totalPoints,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Import hàng loạt câu hỏi từ file Excel/JSON vào Firestore bằng Batch Write
 */
export async function batchImportQuestions(
  examId: string,
  importItems: QuestionImportItem[],
  mode: "append" | "replace" = "append"
): Promise<void> {
  const letters = ["a", "b", "c", "d", "e", "f"];

  if (mode === "replace") {
    // Xóa toàn bộ câu hỏi và đáp án cũ
    const [qSnap, kSnap] = await Promise.all([
      getDocs(collection(db, "exams", examId, "questions")),
      getDocs(collection(db, "exams", examId, "answerKeys")),
    ]);
    const deleteBatch = writeBatch(db);
    qSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
    kSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
    await deleteBatch.commit();
  }

  const existingQuestions = mode === "append" ? await getQuestionsByExamId(examId) : [];
  let currentOrder = existingQuestions.length;

  // Chia nhỏ thành các batch (tối đa 500 thao tác / batch theo giới hạn Firestore)
  const batch = writeBatch(db);

  for (const item of importItems) {
    currentOrder++;
    const qId = `q-${Date.now()}-${currentOrder}-${Math.random().toString(36).substring(2, 6)}`;

    let options: any[] = [];
    if (["single", "multiple"].includes(item.type) && item.options) {
      options = item.options.map((t, idx) => ({ id: letters[idx], text: t }));
    } else if (item.type === "truefalse") {
      options = letters.slice(0, 4).map((l, idx) => ({
        id: l,
        text: item.options?.[idx] || `Ý ${l}`,
      }));
    }

    let correct = item.answer;
    if (item.type === "short") {
      correct = {
        accepted: Array.isArray(item.answer) ? item.answer : [String(item.answer)],
        numeric: item.numeric,
        tolerance: item.tolerance,
      };
    } else if (item.type === "truefalse" && Array.isArray(item.answer)) {
      correct = {
        a: Boolean(item.answer[0]),
        b: Boolean(item.answer[1]),
        c: Boolean(item.answer[2]),
        d: Boolean(item.answer[3]),
      };
    }

    const questionDoc: Question = {
      id: qId,
      order: currentOrder,
      type: item.type,
      text: item.text,
      imageUrl: item.imageUrl || null,
      options,
      points: item.points || 1,
    };

    const keyDoc: AnswerKey = {
      id: qId,
      type: item.type,
      correct,
      explanation: item.explanation || "",
    };

    batch.set(doc(db, "exams", examId, "questions", qId), questionDoc);
    batch.set(doc(db, "exams", examId, "answerKeys", qId), keyDoc);
  }

  await batch.commit();

  // Cập nhật lại số câu và điểm cho đề thi
  const allQ = await getQuestionsByExamId(examId);
  const totalPoints = allQ.reduce((acc, q) => acc + (q.points || 1), 0);
  await updateDoc(doc(db, "exams", examId), {
    questionCount: allQ.length,
    totalPoints,
    updatedAt: new Date().toISOString(),
  });
}

// ==================== 4. LƯỢT LÀM BÀI (ATTEMPTS) ====================

/**
 * Lấy tất cả lượt làm bài của một đề thi từ Firestore
 */
export async function getAttemptsByExamId(examId: string): Promise<Attempt[]> {
  try {
    const q = query(collection(db, "attempts"), where("examId", "==", examId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Attempt));
    list.sort((a, b) => {
      const timeA = new Date(a.submittedAt || a.startedAt || 0).getTime();
      const timeB = new Date(b.submittedAt || b.startedAt || 0).getTime();
      return timeB - timeA;
    });
    return list;
  } catch (err) {
    console.error("Lỗi lấy danh sách bài thi từ Firestore:", err);
    return [];
  }
}

/**
 * Lấy lịch sử làm bài của một học sinh
 */
export async function getAttemptsByStudentId(studentId: string, examId?: string): Promise<Attempt[]> {
  try {
    const q = examId
      ? query(
          collection(db, "attempts"),
          where("studentId", "==", studentId),
          where("examId", "==", examId)
        )
      : query(collection(db, "attempts"), where("studentId", "==", studentId));

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Attempt));
  } catch (err) {
    console.error("Lỗi lấy bài thi của học sinh:", err);
    return [];
  }
}

/**
 * Lấy chi tiết một lượt làm bài theo ID
 */
export async function getAttemptById(attemptId: string): Promise<Attempt | null> {
  try {
    const docSnap = await getDoc(doc(db, "attempts", attemptId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Attempt;
    }
    return null;
  } catch (err) {
    console.error("Lỗi đọc lượt làm bài từ Firestore:", err);
    return null;
  }
}

/**
 * Lưu tiến trình hoặc kết quả làm bài vào Firestore
 */
export async function saveAttempt(attempt: Attempt): Promise<void> {
  await setDoc(doc(db, "attempts", attempt.id), attempt, { merge: true });
}

// ==================== 5. QUẢN LÝ FILE ĐÍNH KÈM ====================

/**
 * Upload file đính kèm cho đề thi và lưu thông tin vào Firestore
 */
export async function uploadExamFile(examId: string, file: File): Promise<ExamFile> {
  let downloadUrl: string = "";
  const path = `exams/${examId}/files/${Date.now()}_${file.name}`;

  try {
    const storage = await getFirebaseStorage();
    if (storage) {
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const fileRef = ref(storage, path);
      const snap = await uploadBytes(fileRef, file);
      downloadUrl = await getDownloadURL(snap.ref);
    }
  } catch (storageErr) {
    console.warn("Storage upload không khả dụng, sử dụng object data URL:", storageErr);
  }

  // Fallback nếu storage không khả dụng
  if (!downloadUrl) {
    if (file.size < 1024 * 1024) {
      // Đọc Base64 nếu file nhỏ < 1MB
      downloadUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    } else {
      downloadUrl = URL.createObjectURL(file);
    }
  }

  const newFile: ExamFile = {
    id: `f-${Date.now()}`,
    name: file.name,
    path,
    size: file.size,
    contentType: file.type || "application/octet-stream",
    uploadedAt: new Date().toISOString(),
    downloadUrl,
  };

  // Cập nhật mảng files trong document đề thi
  const examRef = doc(db, "exams", examId);
  await updateDoc(examRef, {
    files: arrayUnion(newFile),
    updatedAt: new Date().toISOString(),
  });

  return newFile;
}

/**
 * Xóa file đính kèm khỏi đề thi
 */
export async function deleteExamFile(examId: string, fileToDelete: ExamFile): Promise<void> {
  try {
    const storage = await getFirebaseStorage();
    if (storage && fileToDelete.path) {
      const { ref, deleteObject } = await import("firebase/storage");
      const fileRef = ref(storage, fileToDelete.path);
      await deleteObject(fileRef).catch(() => {});
    }
  } catch {}

  const examRef = doc(db, "exams", examId);
  await updateDoc(examRef, {
    files: arrayRemove(fileToDelete),
    updatedAt: new Date().toISOString(),
  });
}
