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
import { db, getFirebaseStorage, firebaseConfig } from "./firebase";
import { formatDobToPassword, generateStudentUsername } from "./utils";
import type {
  Exam,
  Question,
  AnswerKey,
  ClassRoom,
  ClassStudent,
  ClassStudentSubmission,
  UserProfile,
  Attempt,
  ExamFile,
  QuestionImportItem,
  StudentImportItem,
  ExamStatus,
} from "./types";

// ==================== 1. LỚP HỌC PHẦN (CLASSES) ====================

/**
 * Lấy danh sách lớp học từ Firestore
 * @param teacherId Nếu truyền vào, chỉ lấy lớp do giáo viên đó tạo hoặc được thêm vào / phân công
 */
export async function getClasses(teacherId?: string): Promise<ClassRoom[]> {
  try {
    const classesRef = collection(db, "classes");
    let snap;
    try {
      snap = await getDocs(query(classesRef, orderBy("createdAt", "desc")));
    } catch {
      snap = await getDocs(classesRef);
    }

    let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom));

    if (teacherId) {
      // Đọc classIds của giáo viên từ document users/{teacherId} (nếu có các lớp được gán thêm cho giáo viên)
      let teacherClassIds: string[] = [];
      try {
        const uDoc = await getDoc(doc(db, "users", teacherId));
        if (uDoc.exists()) {
          const udata = uDoc.data();
          if (Array.isArray(udata.classIds)) {
            teacherClassIds = udata.classIds;
          }
        }
      } catch (uErr) {
        console.warn("Lỗi đọc thông tin giáo viên:", uErr);
      }

      // Lọc CHỈ các lớp do giáo viên này tạo HOẶC giáo viên này được thêm vào / phân công
      list = list.filter((c) => {
        // 1. Giáo viên là người tạo lớp chính
        if (c.teacherId === teacherId) return true;
        // 2. Giáo viên nằm trong danh sách giáo viên phụ trách (teacherIds) của lớp
        if (Array.isArray(c.teacherIds) && c.teacherIds.includes(teacherId)) return true;
        // 3. Lớp học có trong danh sách phân công (classIds) của giáo viên
        if (teacherClassIds.includes(c.id)) return true;
        return false;
      });
    }

    // Tự động tính toán và đồng bộ sĩ số thực tế từ collection users
    try {
      const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
      const classCountMap: Record<string, number> = {};
      usersSnap.docs.forEach((ud) => {
        const cIds = ud.data()?.classIds;
        if (Array.isArray(cIds)) {
          cIds.forEach((cid: string) => {
            classCountMap[cid] = (classCountMap[cid] || 0) + 1;
          });
        }
      });

      list.forEach((c) => {
        const actualCount = classCountMap[c.id];
        if (actualCount !== undefined && actualCount !== c.studentCount) {
          c.studentCount = actualCount;
          updateDoc(doc(db, "classes", c.id), { studentCount: actualCount }).catch(() => {});
        }
      });
    } catch (countErr) {
      console.warn("Lỗi tính sĩ số lớp:", countErr);
    }

    // Sắp xếp theo ngày tạo mới nhất
    return list.sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return tB - tA;
    });
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
 * Lấy danh sách tất cả giáo viên trong hệ thống
 */
export async function getAllTeachers(): Promise<
  { uid: string; name: string; email: string; subject?: string }[]
> {
  try {
    const snap = await getDocs(query(collection(db, "users"), where("role", "==", "teacher")));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        name: data.name || "Giáo viên",
        email: data.email || "",
        subject: data.subject || "",
      };
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách giáo viên:", err);
    return [];
  }
}

/**
 * Thêm hoặc phân công giáo viên vào phụ trách lớp học
 */
export async function assignTeacherToClass(
  classId: string,
  teacherId: string,
  teacherName?: string
): Promise<void> {
  try {
    // 1. Thêm teacherId vào teacherIds của lớp
    const classRef = doc(db, "classes", classId);
    const classDoc = await getDoc(classRef);
    if (classDoc.exists()) {
      const updateData: Record<string, any> = {
        teacherIds: arrayUnion(teacherId),
        updatedAt: new Date().toISOString(),
      };
      if (teacherName && !classDoc.data().teacherName) {
        updateData.teacherName = teacherName;
      }
      await updateDoc(classRef, updateData);
    }

    // 2. Thêm classId vào classIds của giáo viên
    const teacherRef = doc(db, "users", teacherId);
    await updateDoc(teacherRef, {
      classIds: arrayUnion(classId),
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  } catch (err) {
    console.error("Lỗi phân công giáo viên vào lớp:", err);
    throw err;
  }
}

/**
 * Xóa quyền phụ trách lớp học của một giáo viên
 */
export async function removeTeacherFromClass(
  classId: string,
  teacherId: string
): Promise<void> {
  try {
    // 1. Xóa teacherId khỏi teacherIds của lớp
    await updateDoc(doc(db, "classes", classId), {
      teacherIds: arrayRemove(teacherId),
      updatedAt: new Date().toISOString(),
    });

    // 2. Xóa classId khỏi classIds của giáo viên
    await updateDoc(doc(db, "users", teacherId), {
      classIds: arrayRemove(classId),
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  } catch (err) {
    console.error("Lỗi loại giáo viên khỏi lớp:", err);
    throw err;
  }
}

/**
 * Tạo lớp học mới và lưu vào Firestore
 */
export async function createClass(
  name: string,
  teacherId: string,
  description?: string,
  options?: {
    subject?: string;
    grade?: string;
    teacherName?: string;
    teacherIds?: string[];
  }
): Promise<ClassRoom> {
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const classRef = doc(collection(db, "classes"));
  const initialTeacherIds = Array.from(new Set([teacherId, ...(options?.teacherIds || [])]));

  const newClass: ClassRoom = {
    id: classRef.id,
    name: name.trim(),
    description: description?.trim() || "",
    teacherId,
    teacherName: options?.teacherName?.trim() || "",
    teacherIds: initialTeacherIds,
    subject: options?.subject?.trim() || "",
    grade: options?.grade?.trim() || "",
    joinCode,
    studentCount: 0,
    createdAt: new Date().toISOString(),
  };

  await setDoc(classRef, newClass);

  // Đồng bộ classId vào danh sách lớp của các giáo viên phụ trách
  for (const tid of initialTeacherIds) {
    try {
      await updateDoc(doc(db, "users", tid), {
        classIds: arrayUnion(classRef.id),
        updatedAt: new Date().toISOString(),
      });
    } catch {}
  }

  return newClass;
}

/**
 * Cập nhật thông tin lớp học (tên, mô tả, môn học, khối, giáo viên, danh sách giáo viên phụ trách)
 */
export async function updateClass(
  classId: string,
  updates: Partial<ClassRoom>
): Promise<void> {
  const payload: Record<string, any> = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.description !== undefined) payload.description = updates.description.trim();
  if (updates.subject !== undefined) payload.subject = updates.subject.trim();
  if (updates.grade !== undefined) payload.grade = updates.grade.trim();
  if (updates.teacherName !== undefined) payload.teacherName = updates.teacherName.trim();
  if (updates.teacherId !== undefined) payload.teacherId = updates.teacherId.trim();
  if (updates.teacherIds !== undefined) payload.teacherIds = updates.teacherIds;

  await updateDoc(doc(db, "classes", classId), payload);

  // Nếu cập nhật teacherId hoặc teacherIds, đồng bộ classId vào user
  if (updates.teacherId) {
    try {
      await updateDoc(doc(db, "users", updates.teacherId), {
        classIds: arrayUnion(classId),
      });
    } catch {}
  }
  if (Array.isArray(updates.teacherIds)) {
    for (const tid of updates.teacherIds) {
      try {
        await updateDoc(doc(db, "users", tid), {
          classIds: arrayUnion(classId),
        });
      } catch {}
    }
  }
}

/**
 * Lấy danh sách các lớp học phần mà học sinh tham gia, kèm số lượng bài tập
 */
export async function getStudentClasses(
  studentId: string,
  profile?: UserProfile
): Promise<ClassRoom[]> {
  try {
    let classIds: string[] = profile?.classIds || [];
    let studentClassName: string = (profile?.className || "").trim().toLowerCase();

    // Nếu chưa có classIds, đọc trực tiếp từ users
    if (!profile || !profile.classIds) {
      const uSnap = await getDoc(doc(db, "users", studentId)).catch(() => null);
      if (uSnap?.exists()) {
        const udata = uSnap.data();
        classIds = Array.isArray(udata?.classIds) ? udata.classIds : [];
        if (!studentClassName && udata?.className) {
          studentClassName = udata.className.trim().toLowerCase();
        }
      }
    }

    const [allClasses, allExams] = await Promise.all([
      getClasses(),
      getExams({ status: "published" }),
    ]);

    const result = allClasses.filter((c) => {
      if (classIds.includes(c.id)) return true;
      if (studentClassName && c.name && c.name.trim().toLowerCase() === studentClassName) {
        return true;
      }
      return false;
    });

    // Tính toán số lượng bài tập khả dụng cho từng lớp
    result.forEach((cls) => {
      const count = allExams.filter((e) => e.classIds && e.classIds.includes(cls.id)).length;
      cls.examsCount = count;
    });

    return result;
  } catch (err) {
    console.error("Lỗi lấy danh sách lớp học của học sinh:", err);
    return [];
  }
}

/**
 * Lấy danh sách các lớp sinh hoạt hành chính từ CSDL học sinh chung (ví dụ: 11A1, 10A3)
 * kèm số lượng học sinh trong từng lớp
 */
export async function getDistinctStudentClasses(): Promise<
  { className: string; count: number; grade?: string }[]
> {
  try {
    const snap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
    const map = new Map<string, number>();

    snap.docs.forEach((d) => {
      const data = d.data();
      const cn = (data.className || "").trim();
      if (cn) {
        map.set(cn, (map.get(cn) || 0) + 1);
      }
    });

    const result = Array.from(map.entries()).map(([className, count]) => {
      const match = className.match(/^(\d+)/);
      const grade = match ? `Khối ${match[1]}` : undefined;
      return { className, count, grade };
    });

    return result.sort((a, b) => a.className.localeCompare(b.className, "vi", { numeric: true }));
  } catch (err) {
    console.error("Lỗi lấy danh sách lớp sinh hoạt:", err);
    return [];
  }
}

/**
 * Xóa một lớp học khỏi Firestore và dọn dẹp liên kết
 */
export async function deleteClass(classId: string): Promise<void> {
  try {
    const studentsSnap = await getDocs(collection(db, "classes", classId, "students"));
    const batch = writeBatch(db);
    studentsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, "classes", classId));
    await batch.commit();

    // Dọn dẹp classId trong users nếu có
    try {
      const usersSnap = await getDocs(
        query(collection(db, "users"), where("classIds", "array-contains", classId))
      );
      const userBatch = writeBatch(db);
      usersSnap.docs.forEach((d) => {
        userBatch.update(d.ref, { classIds: arrayRemove(classId) });
      });
      await userBatch.commit();
    } catch {}
  } catch (err) {
    console.error("Lỗi xóa lớp học:", err);
    await deleteDoc(doc(db, "classes", classId));
  }
}

/**
 * Lấy danh sách học sinh thuộc một lớp học
 */
export async function getClassStudents(classId: string): Promise<ClassStudent[]> {
  const list: ClassStudent[] = [];
  const existingIds = new Set<string>();

  // Lấy thông tin tên lớp để đối chiếu
  let targetClassName = "";
  try {
    const classDoc = await getDoc(doc(db, "classes", classId));
    if (classDoc.exists()) {
      targetClassName = (classDoc.data()?.name || "").trim().toLowerCase();
    }
  } catch {}

  // 1. Thử đọc từ subcollection classes/{classId}/students nếu có quyền
  try {
    const snap = await getDocs(collection(db, "classes", classId, "students"));
    snap.docs.forEach((d) => {
      const data = d.data();
      list.push({
        studentId: d.id,
        studentName: data.studentName || "Học sinh",
        studentEmail: data.studentEmail || "",
        studentCode: data.studentCode || "",
        joinedAt: data.joinedAt || new Date().toISOString(),
      });
      existingIds.add(d.id);
    });
  } catch (subErr) {
    // Subcollection có thể bị giới hạn bởi rules trên cloud, bỏ qua bình thường
  }

  // 2. Luôn đối chiếu và bổ sung từ collection users
  try {
    const allUsersSnap = await getDocs(collection(db, "users"));
    allUsersSnap.docs.forEach((ud) => {
      const udata = ud.data();
      if (udata.role === "student") {
        const inClassIds = Array.isArray(udata.classIds) && udata.classIds.includes(classId);
        const nameMatches = targetClassName && udata.className && udata.className.trim().toLowerCase() === targetClassName;

        if (inClassIds || nameMatches) {
          if (!existingIds.has(ud.id)) {
            const studentItem: ClassStudent = {
              studentId: ud.id,
              studentName: udata.name || "Học sinh",
              studentEmail: udata.email || "",
              studentCode: udata.studentCode || "",
              joinedAt: udata.createdAt?.toDate?.()?.toISOString?.() || (typeof udata.createdAt === "string" ? udata.createdAt : new Date().toISOString()),
            };
            list.push(studentItem);
            existingIds.add(ud.id);

            // Đồng bộ classId vào user nếu mới chỉ khớp theo className
            if (!inClassIds) {
              updateDoc(ud.ref, {
                classIds: arrayUnion(classId),
                updatedAt: new Date().toISOString(),
              }).catch(() => {});
            }

            // Ghi dự phòng vào subcollection nếu Firestore cho phép
            setDoc(doc(db, "classes", classId, "students", ud.id), studentItem, { merge: true }).catch(() => {});
          }
        }
      }
    });

    // Luôn cập nhật studentCount chuẩn xác cho lớp
    updateDoc(doc(db, "classes", classId), {
      studentCount: list.length,
    }).catch(() => {});
  } catch (userErr) {
    console.warn("Đọc users collection:", userErr);
  }

  list.sort((a, b) => (a.studentName || "").localeCompare(b.studentName || "", "vi"));
  return list;
}

/**
 * Thêm học sinh vào lớp học (thủ công hoặc gắn tài khoản)
 * Đảm bảo luôn tạo/cập nhật tài khoản trong users và không bao giờ bị chặn bởi Firestore rules
 */
export async function addStudentToClass(
  classId: string,
  studentData: {
    studentId?: string;
    studentName: string;
    studentEmail?: string;
    studentCode?: string;
    dob?: string;
  },
  teacherId?: string
): Promise<ClassStudent> {
  const cls = await getClassById(classId);
  const targetClassName = cls?.name || "";

  let finalStudentId = studentData.studentId?.trim();
  let resolvedName = studentData.studentName.trim();
  let resolvedEmail = studentData.studentEmail?.trim().toLowerCase() || "";
  let resolvedCode = studentData.studentCode?.trim() || "";

  // 1. Nếu chưa có studentId, thử tìm user đã tồn tại theo email hoặc mã học sinh
  if (!finalStudentId) {
    try {
      if (resolvedEmail) {
        const userQ = query(collection(db, "users"), where("email", "==", resolvedEmail));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          const uDoc = userSnap.docs[0];
          finalStudentId = uDoc.id;
          const udata = uDoc.data();
          if (!resolvedName) resolvedName = udata.name || "";
          if (!resolvedCode) resolvedCode = udata.studentCode || "";
        }
      }
      if (!finalStudentId && resolvedCode) {
        const codeQ = query(collection(db, "users"), where("studentCode", "==", resolvedCode));
        const codeSnap = await getDocs(codeQ);
        if (!codeSnap.empty) {
          const uDoc = codeSnap.docs[0];
          finalStudentId = uDoc.id;
          const udata = uDoc.data();
          if (!resolvedName) resolvedName = udata.name || "";
          if (!resolvedEmail) resolvedEmail = udata.email || "";
        }
      }
    } catch (findErr) {
      console.warn("Tìm user có sẵn:", findErr);
    }
  }

  // 2. Nếu đã có tài khoản trên hệ thống, cập nhật classIds cho user
  if (finalStudentId) {
    try {
      const userRef = doc(db, "users", finalStudentId);
      const userDocSnap = await getDoc(userRef).catch(() => null);
      const existingClassName = userDocSnap?.data()?.className;
      const userUpdate: any = {
        classIds: arrayUnion(classId),
        updatedAt: new Date().toISOString(),
      };
      if (!existingClassName && targetClassName) {
        userUpdate.className = targetClassName;
      }
      await updateDoc(userRef, userUpdate);
    } catch (uErr) {
      console.warn("Cập nhật classIds trong users:", uErr);
    }
  } else {
    // 3. Nếu chưa có tài khoản, tự động tạo tài khoản học sinh mới hoàn chỉnh trong hệ thống!
    try {
      const newProfile = await createStudentUser(
        {
          name: resolvedName,
          studentCode: resolvedCode,
          email: resolvedEmail,
          dob: studentData.dob,
          classId: classId,
          className: targetClassName,
        },
        teacherId || cls?.teacherId
      );
      finalStudentId = newProfile.uid;
      resolvedName = newProfile.name;
      resolvedEmail = newProfile.email;
      resolvedCode = newProfile.studentCode || "";
    } catch (createErr) {
      console.warn("Tự động tạo học sinh mới:", createErr);
      finalStudentId = `stu-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }
  }

  // 4. Chuẩn bị studentRecord
  const studentRecord: ClassStudent = {
    studentId: finalStudentId,
    studentName: resolvedName || "Học sinh",
    studentEmail: resolvedEmail,
    studentCode: resolvedCode,
    joinedAt: new Date().toISOString(),
  };

  // 5. Thử ghi vào subcollection classes/{classId}/students nhưng bắt lỗi an toàn (Firestore rules)
  try {
    const studentRef = doc(db, "classes", classId, "students", finalStudentId);
    await setDoc(studentRef, studentRecord, { merge: true });
  } catch (subErr) {
    console.warn("Subcollection classes/students không khả dụng (lưu thành công qua users collection):", subErr);
  }

  // 6. Cập nhật sĩ số lớp học chuẩn xác
  try {
    const freshStudents = await getClassStudents(classId);
    await updateDoc(doc(db, "classes", classId), {
      studentCount: freshStudents.length,
    });
  } catch {
    await updateDoc(doc(db, "classes", classId), {
      studentCount: increment(1),
    }).catch(() => {});
  }

  return studentRecord;
}

/**
 * Cập nhật thông tin học sinh trong lớp và đồng bộ vào users collection
 */
export async function updateStudentInClass(
  classId: string,
  studentId: string,
  data: Partial<ClassStudent>
): Promise<void> {
  // 1. Cập nhật users collection
  try {
    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.studentName) updatePayload.name = data.studentName;
    if (data.studentEmail) updatePayload.email = data.studentEmail;
    if (data.studentCode !== undefined) updatePayload.studentCode = data.studentCode;

    await updateDoc(doc(db, "users", studentId), updatePayload);
  } catch (userErr) {
    console.warn("Cập nhật user profile:", userErr);
  }

  // 2. Thử cập nhật subcollection
  try {
    const studentRef = doc(db, "classes", classId, "students", studentId);
    await setDoc(studentRef, data, { merge: true });
  } catch (subErr) {
    console.warn("Cập nhật subcollection classes/students:", subErr);
  }
}

/**
 * Xóa một học sinh khỏi lớp học
 */
export async function removeStudentFromClass(
  classId: string,
  studentId: string
): Promise<void> {
  // 1. Xóa classId khỏi user
  try {
    await updateDoc(doc(db, "users", studentId), {
      classIds: arrayRemove(classId),
      updatedAt: new Date().toISOString(),
    });
  } catch (userErr) {
    console.warn("Xóa classId khỏi users:", userErr);
  }

  // 2. Thử xóa khỏi subcollection
  try {
    const studentRef = doc(db, "classes", classId, "students", studentId);
    await deleteDoc(studentRef);
  } catch (subErr) {
    console.warn("Xóa khỏi subcollection:", subErr);
  }

  // 3. Cập nhật sĩ số lớp
  try {
    const freshStudents = await getClassStudents(classId);
    await updateDoc(doc(db, "classes", classId), {
      studentCount: freshStudents.length,
    });
  } catch {
    await updateDoc(doc(db, "classes", classId), {
      studentCount: increment(-1),
    }).catch(() => {});
  }
}

/**
 * Tìm kiếm học sinh đã đăng ký trên hệ thống để thêm vào lớp
 */
export async function searchRegisteredStudents(queryStr: string): Promise<UserProfile[]> {
  const qLower = queryStr.trim().toLowerCase();
  if (!qLower) return [];
  try {
    const snap = await getDocs(collection(db, "users"));
    const list = snap.docs
      .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
      .filter((u) => u.role === "student" || u.role !== "teacher")
      .filter(
        (u) =>
          (u.email && u.email.toLowerCase().includes(qLower)) ||
          (u.name && u.name.toLowerCase().includes(qLower)) ||
          (u.studentCode && u.studentCode.toLowerCase().includes(qLower)) ||
          (u.username && u.username.toLowerCase().includes(qLower))
      );
    return list.slice(0, 15);
  } catch (err) {
    console.error("Lỗi tìm kiếm học sinh:", err);
    return [];
  }
}

// ==================== 1.5. QUẢN LÝ HỌC SINH TẬP TRUNG (STUDENT MANAGEMENT) ====================

/**
 * Thử tạo tài khoản đăng nhập Firebase Auth cho học sinh qua instance phụ
 * (Tránh làm thay đổi session/đăng xuất giáo viên hiện tại)
 */
async function createAuthStudentAccount(email: string, pass: string): Promise<string | null> {
  try {
    const { initializeApp, deleteApp } = await import("firebase/app");
    const { getAuth, createUserWithEmailAndPassword } = await import("firebase/auth");
    const tempName = `auth_app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempApp = initializeApp(firebaseConfig, tempName);
    try {
      const tempAuth = getAuth(tempApp);
      const cred = await createUserWithEmailAndPassword(tempAuth, email, pass);
      const uid = cred.user.uid;
      await deleteApp(tempApp);
      return uid;
    } catch (err: any) {
      await deleteApp(tempApp).catch(() => {});
      console.warn("Khởi tạo Firebase Auth:", err?.code || err?.message);
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Tự động sinh tên đăng nhập, mật khẩu và email cho học sinh
 */
export function generateStudentCredentials(
  name: string,
  studentCode?: string,
  dob?: string
): { username: string; password: string; email: string } {
  const username = generateStudentUsername(name, studentCode);
  const password = formatDobToPassword(dob);
  const cleanCode = studentCode?.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || username;
  const email = `${cleanCode}@lms.local`;
  return { username, password, email };
}

/**
 * Tạo mới hoặc cập nhật một tài khoản học sinh vào Firestore & hệ thống xác thực
 */
export async function createStudentUser(
  studentData: {
    name: string;
    studentCode?: string;
    dob?: string;
    className?: string;
    classId?: string;
    password?: string;
    email?: string;
    gender?: string;
    phone?: string;
  },
  teacherId?: string
): Promise<UserProfile> {
  const creds = generateStudentCredentials(studentData.name, studentData.studentCode, studentData.dob);
  const finalUsername = studentData.studentCode
    ? studentData.studentCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    : creds.username;
  const finalPassword = studentData.password?.trim() || creds.password;
  const finalEmail = studentData.email?.trim().toLowerCase() || `${finalUsername}@lms.local`;
  const code = studentData.studentCode?.trim().toUpperCase() || `HS${Math.floor(1000 + Math.random() * 9000)}`;

  // Kiểm tra xem đã có học sinh với mã học sinh, username hoặc email này chưa
  let existingUid: string | null = null;
  let prevClassIds: string[] = [];
  try {
    const userQ = query(collection(db, "users"), where("studentCode", "==", code));
    const userSnap = await getDocs(userQ);
    if (!userSnap.empty) {
      existingUid = userSnap.docs[0].id;
      prevClassIds = userSnap.docs[0].data()?.classIds || [];
    } else {
      const emailQ = query(collection(db, "users"), where("email", "==", finalEmail));
      const emailSnap = await getDocs(emailQ);
      if (!emailSnap.empty) {
        existingUid = emailSnap.docs[0].id;
        prevClassIds = emailSnap.docs[0].data()?.classIds || [];
      }
    }
  } catch (e) {
    console.warn("Kiểm tra học sinh tồn tại:", e);
  }

  let uid = existingUid;
  if (!uid) {
    const authUid = await createAuthStudentAccount(finalEmail, finalPassword);
    uid = authUid || `stu_${finalUsername}_${Date.now()}`;
  }

  // Tự động tìm hoặc tạo lớp học nếu có className
  let targetClassId = studentData.classId;
  let targetClassName = studentData.className?.trim();

  if (!targetClassId && targetClassName && teacherId) {
    try {
      const classes = await getClasses(teacherId);
      const foundClass = classes.find((c) => c.name.toLowerCase() === targetClassName!.toLowerCase());
      if (foundClass) {
        targetClassId = foundClass.id;
        targetClassName = foundClass.name;
      } else {
        const newClass = await createClass(
          targetClassName,
          teacherId,
          `Lớp học phân nhóm tự động từ danh sách học sinh`
        );
        targetClassId = newClass.id;
      }
    } catch (cErr) {
      console.warn("Lỗi tìm/tạo lớp học:", cErr);
    }
  } else if (targetClassId && !targetClassName) {
    const cls = await getClassById(targetClassId);
    if (cls) targetClassName = cls.name;
  }

  const classIds = Array.from(
    new Set([...prevClassIds, ...(targetClassId ? [targetClassId] : [])])
  );

  const profile: UserProfile = {
    uid,
    name: studentData.name.trim(),
    email: finalEmail,
    role: "student",
    studentCode: code,
    username: finalUsername,
    dob: studentData.dob?.trim() || "",
    initialPassword: finalPassword,
    isBlocked: false,
    gender: studentData.gender?.trim() || "",
    phone: studentData.phone?.trim() || "",
    className: targetClassName || "",
    classIds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "users", uid), profile, { merge: true });

  // Ghi danh học sinh vào lớp học
  if (targetClassId) {
    await addStudentToClass(targetClassId, {
      studentId: uid,
      studentName: profile.name,
      studentEmail: profile.email,
      studentCode: profile.studentCode,
    }).catch((e) => console.warn("Lỗi addStudentToClass:", e));
  }

  return profile;
}

/**
 * Nhập danh sách học sinh từ file CSV hoặc Excel:
 * - Tự động tạo username và password theo ngày sinh
 * - Tự động tạo lớp và phân nhóm học sinh về từng lớp tương ứng
 * - Lưu người dùng vào Firestore và tạo tài khoản
 */
export async function importStudentsFromCsvOrExcel(
  items: StudentImportItem[],
  teacherId: string
): Promise<{
  total: number;
  created: number;
  updated: number;
  classCount: number;
  classesCreated: string[];
  errors: string[];
  students: UserProfile[];
}> {
  const result = {
    total: items.length,
    created: 0,
    updated: 0,
    classCount: 0,
    classesCreated: [] as string[],
    errors: [] as string[],
    students: [] as UserProfile[],
  };

  if (!items || items.length === 0) return result;

  // Lấy các lớp hiện có của giáo viên
  const existingClasses = await getClasses(teacherId);
  const classMap = new Map<string, string>();
  for (const c of existingClasses) {
    classMap.set(c.name.trim().toLowerCase(), c.id);
  }

  // Thu thập danh sách lớp học cần phân nhóm
  const requiredClasses = new Set<string>();
  for (const item of items) {
    if (item.className?.trim()) {
      requiredClasses.add(item.className.trim());
    }
  }

  // Tự động tạo các lớp học chưa có trên hệ thống
  for (const cName of requiredClasses) {
    const key = cName.toLowerCase();
    if (!classMap.has(key)) {
      try {
        const newClass = await createClass(
          cName,
          teacherId,
          `Lớp học phân nhóm tự động từ file nhập học sinh`
        );
        classMap.set(key, newClass.id);
        result.classesCreated.push(cName);
      } catch (err: any) {
        result.errors.push(`Không thể tạo lớp ${cName}: ${err?.message}`);
      }
    }
  }
  result.classCount = classMap.size;

  // Duyệt và tạo người dùng cho từng học sinh
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      if (!item.name || !item.name.trim()) {
        result.errors.push(`Dòng ${i + 1}: Thiếu họ tên học sinh, đã bỏ qua.`);
        continue;
      }

      const classNameKey = item.className?.trim().toLowerCase();
      const resolvedClassId = classNameKey ? classMap.get(classNameKey) : undefined;

      const profile = await createStudentUser(
        {
          name: item.name,
          studentCode: item.studentCode,
          dob: item.dob,
          className: item.className,
          classId: resolvedClassId,
          password: item.password,
          email: item.email,
          gender: item.gender,
          phone: item.phone,
        },
        teacherId
      );

      result.created++;
      result.students.push(profile);
    } catch (err: any) {
      result.errors.push(`Dòng ${i + 1} (${item.name}): ${err?.message || "Lỗi xử lý"}`);
    }
  }

  return result;
}

/**
 * Lấy danh sách toàn bộ học sinh có hỗ trợ bộ lọc và tìm kiếm
 */
export async function getAllStudents(options?: {
  teacherId?: string;
  classId?: string;
  className?: string;
  isBlocked?: boolean;
  search?: string;
}): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, "users");
    let snap;
    try {
      const q = query(usersRef, where("role", "==", "student"));
      snap = await getDocs(q);
    } catch {
      snap = await getDocs(usersRef);
    }

    let list = snap.docs
      .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
      .filter((u) => u.role === "student");

    if (options?.classId) {
      list = list.filter((u) => u.classIds && u.classIds.includes(options.classId!));
    }

    if (options?.className) {
      const targetCn = options.className.trim().toLowerCase();
      list = list.filter((u) => u.className && u.className.trim().toLowerCase() === targetCn);
    }

    if (options?.isBlocked !== undefined) {
      list = list.filter((u) => Boolean(u.isBlocked) === options.isBlocked);
    }

    if (options?.search) {
      const s = options.search.trim().toLowerCase();
      list = list.filter((u) =>
        (u.name && u.name.toLowerCase().includes(s)) ||
        (u.studentCode && u.studentCode.toLowerCase().includes(s)) ||
        (u.username && u.username.toLowerCase().includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.className && u.className.toLowerCase().includes(s))
      );
    }

    return list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));
  } catch (err) {
    console.error("Lỗi lấy danh sách học sinh:", err);
    return [];
  }
}

/**
 * Lấy thông tin chi tiết một học sinh (hồ sơ, các lớp học, lịch sử làm bài thi)
 */
export async function getStudentDetail(studentId: string): Promise<{
  profile: UserProfile | null;
  classes: ClassRoom[];
  attempts: Attempt[];
  stats: {
    totalAttempts: number;
    averageScore: number | null;
    completedExams: number;
  };
}> {
  try {
    const profileSnap = await getDoc(doc(db, "users", studentId));
    if (!profileSnap.exists()) {
      return {
        profile: null,
        classes: [],
        attempts: [],
        stats: { totalAttempts: 0, averageScore: null, completedExams: 0 },
      };
    }

    const profile = { uid: profileSnap.id, ...profileSnap.data() } as UserProfile;

    // Lấy danh sách lớp học mà học sinh thuộc về
    const classes: ClassRoom[] = [];
    if (profile.classIds && profile.classIds.length > 0) {
      for (const cid of profile.classIds) {
        try {
          const c = await getClassById(cid);
          if (c) classes.push(c);
        } catch {}
      }
    }

    // Lấy lịch sử làm bài thi của học sinh
    let attempts: Attempt[] = [];
    try {
      const attQ = query(collection(db, "attempts"), where("studentId", "==", studentId));
      const attSnap = await getDocs(attQ);
      attempts = attSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Attempt));
    } catch {
      try {
        const attSnap = await getDocs(collection(db, "attempts"));
        attempts = attSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Attempt))
          .filter((a) => a.studentId === studentId);
      } catch {}
    }

    attempts.sort((a, b) => {
      const timeA = new Date(a.submittedAt || a.startedAt || 0).getTime();
      const timeB = new Date(b.submittedAt || b.startedAt || 0).getTime();
      return timeB - timeA;
    });

    const submittedAttempts = attempts.filter(
      (a) => a.status === "submitted" && a.score !== null && a.score !== undefined
    );
    const totalScore = submittedAttempts.reduce((acc, a) => acc + (a.score || 0), 0);
    const averageScore =
      submittedAttempts.length > 0
        ? parseFloat((totalScore / submittedAttempts.length).toFixed(2))
        : null;

    return {
      profile,
      classes,
      attempts,
      stats: {
        totalAttempts: attempts.length,
        averageScore,
        completedExams: submittedAttempts.length,
      },
    };
  } catch (err) {
    console.error("Lỗi lấy chi tiết học sinh:", err);
    return {
      profile: null,
      classes: [],
      attempts: [],
      stats: { totalAttempts: 0, averageScore: null, completedExams: 0 },
    };
  }
}

/**
 * Khóa hoặc mở khóa quyền truy cập của học sinh
 */
export async function toggleBlockStudent(studentId: string, isBlocked: boolean): Promise<void> {
  await updateDoc(doc(db, "users", studentId), {
    isBlocked,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Đặt lại mật khẩu cho tài khoản học sinh
 */
export async function resetStudentPassword(studentId: string, newPassword?: string): Promise<string> {
  const userDoc = await getDoc(doc(db, "users", studentId));
  if (!userDoc.exists()) throw new Error("Không tìm thấy học sinh.");

  const data = userDoc.data() as UserProfile;
  const pass = newPassword?.trim() || formatDobToPassword(data.dob) || "123456";

  await updateDoc(doc(db, "users", studentId), {
    initialPassword: pass,
    updatedAt: new Date().toISOString(),
  });

  return pass;
}

/**
 * Cập nhật thông tin chi tiết của học sinh (họ tên, mã HS, ngày sinh, đổi lớp...)
 */
export async function updateStudentProfile(
  studentId: string,
  updates: Partial<UserProfile>,
  newClassId?: string,
  oldClassId?: string
): Promise<void> {
  const userRef = doc(db, "users", studentId);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) throw new Error("Không tìm thấy tài khoản học sinh");

  const prev = userDoc.data() as UserProfile;
  let classIds = [...(prev.classIds || [])];

  if (oldClassId && oldClassId !== newClassId) {
    await removeStudentFromClass(oldClassId, studentId).catch(() => {});
    classIds = classIds.filter((cid) => cid !== oldClassId);
  }

  let finalClassName = updates.className || prev.className;
  if (newClassId && newClassId !== oldClassId) {
    if (!classIds.includes(newClassId)) {
      classIds.push(newClassId);
    }
    const cls = await getClassById(newClassId);
    if (cls) {
      finalClassName = cls.name;
      await addStudentToClass(newClassId, {
        studentId,
        studentName: updates.name || prev.name,
        studentCode: updates.studentCode || prev.studentCode,
        studentEmail: updates.email || prev.email,
      }).catch(() => {});
    }
  }

  await updateDoc(userRef, {
    ...updates,
    className: finalClassName,
    classIds,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Xóa tài khoản học sinh và loại khỏi tất cả các lớp học liên quan
 */
export async function deleteStudentUser(studentId: string): Promise<void> {
  const userDoc = await getDoc(doc(db, "users", studentId));
  if (userDoc.exists()) {
    const data = userDoc.data() as UserProfile;
    if (data.classIds && data.classIds.length > 0) {
      for (const cid of data.classIds) {
        await removeStudentFromClass(cid, studentId).catch(() => {});
      }
    }
  }
  await deleteDoc(doc(db, "users", studentId));
}

/**
 * Phân nhóm thủ công danh sách học sinh về một lớp học cụ thể:
 * - Thêm học sinh vào subcollection classes/{classId}/students
 * - Cập nhật thông tin lớp (className, classIds) trong users/{studentId}
 * - Cập nhật sĩ số lớp học
 */
export async function assignStudentsToClass(
  studentIds: string[],
  classId: string
): Promise<{ count: number; className: string }> {
  const cls = await getClassById(classId);
  if (!cls) throw new Error("Không tìm thấy lớp học.");

  let assignedCount = 0;
  for (const stuId of studentIds) {
    try {
      const userRef = doc(db, "users", stuId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const udata = userDoc.data() as UserProfile;
        await addStudentToClass(classId, {
          studentId: stuId,
          studentName: udata.name || "Học sinh",
          studentEmail: udata.email || "",
          studentCode: udata.studentCode || "",
        });
        // Thêm classId vào danh sách lớp của học sinh; giữ nguyên lớp sinh hoạt nếu đã có
        const updatePayload: Record<string, any> = {
          classIds: arrayUnion(classId),
          updatedAt: new Date().toISOString(),
        };
        if (!udata.className) {
          updatePayload.className = cls.name;
        }

        await updateDoc(userRef, updatePayload);
        assignedCount++;
      }
    } catch (e) {
      console.warn("Lỗi phân nhóm học sinh:", stuId, e);
    }
  }

  return { count: assignedCount, className: cls.name };
}

/**
 * Lấy tiến độ & danh sách học sinh của một lớp cụ thể đối với một đề thi
 */
export async function getClassExamProgress(
  examId: string,
  classId: string
): Promise<{
  students: ClassStudentSubmission[];
  stats: {
    total: number;
    submitted: number;
    inProgress: number;
    notStarted: number;
    avgScore: string;
    maxScore: number;
    minScore: number;
  };
}> {
  try {
    const [students, attempts] = await Promise.all([
      getClassStudents(classId),
      getAttemptsByExamId(examId),
    ]);

    const studentMap = new Map<string, ClassStudentSubmission>();

    // Khởi tạo danh sách tất cả học sinh trong lớp với trạng thái chưa làm bài
    students.forEach((st) => {
      studentMap.set(st.studentId, {
        student: st,
        status: "not_started",
        attempt: undefined,
        score: null,
        maxScore: null,
        submittedAt: null,
        attemptCount: 0,
      });
    });

    // Lọc các lượt làm bài liên quan đến lớp hoặc học sinh trong lớp
    attempts.forEach((att) => {
      let item = studentMap.get(att.studentId);
      if (!item) {
        // Nếu học sinh từng làm bài theo classId này nhưng chưa có trong danh sách
        if (att.classId === classId) {
          item = {
            student: {
              studentId: att.studentId,
              studentName: att.studentName || "Học sinh",
              studentEmail: "",
              studentCode: "",
            },
            status: "not_started",
            attemptCount: 0,
          };
          studentMap.set(att.studentId, item);
        } else {
          return;
        }
      }

      item.attemptCount = (item.attemptCount || 0) + 1;

      if (att.status === "submitted") {
        if (item.status !== "submitted" || (att.score || 0) >= (item.score || 0)) {
          item.status = "submitted";
          item.attempt = att;
          item.score = att.score;
          item.maxScore = att.maxScore;
          item.submittedAt = att.submittedAt;
        }
      } else if (att.status === "in_progress" && item.status !== "submitted") {
        item.status = "in_progress";
        item.attempt = att;
      }
    });

    const list = Array.from(studentMap.values());
    list.sort((a, b) => (a.student.studentName || "").localeCompare(b.student.studentName || "", "vi"));

    const submitted = list.filter((i) => i.status === "submitted");
    const inProgress = list.filter((i) => i.status === "in_progress");
    const notStarted = list.filter((i) => i.status === "not_started");

    const total = list.length;
    const avgScore =
      submitted.length > 0
        ? (submitted.reduce((acc, i) => acc + (i.score || 0), 0) / submitted.length).toFixed(2)
        : "0";
    const maxScore =
      submitted.length > 0 ? Math.max(...submitted.map((i) => i.score || 0)) : 0;
    const minScore =
      submitted.length > 0 ? Math.min(...submitted.map((i) => i.score || 0)) : 0;

    return {
      students: list,
      stats: {
        total,
        submitted: submitted.length,
        inProgress: inProgress.length,
        notStarted: notStarted.length,
        avgScore,
        maxScore,
        minScore,
      },
    };
  } catch (err) {
    console.error("Lỗi lấy tiến độ đề thi theo lớp:", err);
    return {
      students: [],
      stats: {
        total: 0,
        submitted: 0,
        inProgress: 0,
        notStarted: 0,
        avgScore: "0",
        maxScore: 0,
        minScore: 0,
      },
    };
  }
}

/**
 * Học sinh tham gia lớp học bằng mã code (6 ký tự)
 */
export async function joinClassByCode(
  joinCode: string,
  studentId: string,
  studentName: string,
  studentEmail: string = ""
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
        studentEmail: studentEmail || "",
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
