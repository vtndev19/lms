import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getClassStudents,
  addStudentToClass,
  updateStudentInClass,
  removeStudentFromClass,
  searchRegisteredStudents,
  getDistinctStudentClasses,
  assignStudentsToClass,
  getAllStudents,
  getAllTeachers,
  assignTeacherToClass,
  removeTeacherFromClass,
} from "../../lib/db";
import { exportClassStudentsToExcel } from "../../lib/exportExcel";
import type { ClassRoom, ClassStudent, UserProfile } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import {
  Users,
  Plus,
  Copy,
  Check,
  School,
  Trash2,
  Edit2,
  Search,
  Download,
  ArrowLeft,
  UserPlus,
  Mail,
  UserCheck,
  AlertCircle,
  FileSpreadsheet,
  X,
  BookOpen,
  Calendar,
  Sparkles,
  Filter,
  CheckSquare,
  GraduationCap,
  Layers,
} from "lucide-react";

export const SUBJECT_OPTIONS = [
  "Toán học",
  "Vật lý",
  "Hóa học",
  "Sinh học",
  "Tin học",
  "Ngữ văn",
  "Tiếng Anh",
  "Lịch sử",
  "Địa lý",
  "GDCD",
  "Công nghệ",
  "Khoa học tự nhiên",
  "Lịch sử & Địa lý",
  "Khác",
];

export const GRADE_OPTIONS = [
  "Khối 12",
  "Khối 11",
  "Khối 10",
  "Khối 9",
  "Khối 8",
  "Khối 7",
  "Khối 6",
  "Khác",
];

export default function TeacherClassesPage() {
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const urlClassId = searchParams.get("classId");

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view: null = Class list; ClassRoom = Class student detail
  const [activeClass, setActiveClass] = useState<ClassRoom | null>(null);

  // Modals for Class CRUD
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [classNameInput, setClassNameInput] = useState("");
  const [classDescInput, setClassDescInput] = useState("");
  const [classSubjectInput, setClassSubjectInput] = useState("");
  const [classGradeInput, setClassGradeInput] = useState("");
  const [classTeacherIdInput, setClassTeacherIdInput] = useState("");
  const [classTeacherNameInput, setClassTeacherNameInput] = useState("");

  // Teacher assignment & co-teacher state
  const [allTeachers, setAllTeachers] = useState<
    { uid: string; name: string; email: string; subject?: string }[]
  >([]);
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);
  const [teacherToAssignId, setTeacherToAssignId] = useState("");
  const [assigningTeacher, setAssigningTeacher] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Students state for active class
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Modals for Student CRUD
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addStudentTab, setAddStudentTab] = useState<"adminGroup" | "manual" | "search" | "batch">("adminGroup");
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [manualDob, setManualDob] = useState("");

  // Admin class filter states for batch adding from school DB
  const [adminClasses, setAdminClasses] = useState<{ className: string; count: number; grade?: string }[]>([]);
  const [selectedAdminClass, setSelectedAdminClass] = useState("");
  const [adminClassStudents, setAdminClassStudents] = useState<UserProfile[]>([]);
  const [loadingAdminStudents, setLoadingAdminStudents] = useState(false);
  const [selectedStudentUids, setSelectedStudentUids] = useState<string[]>([]);
  const [adminStudentSearch, setAdminStudentSearch] = useState("");

  // Search existing registered users
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserProfile[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Batch import paste text
  const [batchText, setBatchText] = useState("");

  // Edit student modal
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<ClassStudent | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentEmail, setEditStudentEmail] = useState("");
  const [editStudentCode, setEditStudentCode] = useState("");

  // Operation loading states
  const [savingAction, setSavingAction] = useState(false);

  useEffect(() => {
    if (userProfile?.uid) {
      loadClasses();
      getAllTeachers().then(setAllTeachers).catch(() => {});
    }
  }, [userProfile?.uid]);

  // When active class changes, load its students
  useEffect(() => {
    if (activeClass?.id) {
      loadStudents(activeClass.id);
    }
  }, [activeClass?.id]);

  async function loadClasses() {
    setLoading(true);
    try {
      const list = await getClasses(userProfile?.uid);
      setClasses(list);

      // Nếu có query param classId và chưa mở lớp nào, tự động mở lớp tương ứng
      if (urlClassId && !activeClass) {
        const target = list.find((c) => c.id === urlClassId);
        if (target) {
          setActiveClass(target);
          return;
        }
      }

      // Keep active class synced if open
      if (activeClass) {
        const updated = list.find((c) => c.id === activeClass.id);
        if (updated) setActiveClass(updated);
      }
    } catch (err: any) {
      console.error("Lỗi tải lớp:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents(classId: string) {
    setStudentsLoading(true);
    try {
      const list = await getClassStudents(classId);
      setStudents(list);
    } catch (err) {
      console.error("Lỗi tải danh sách học sinh:", err);
    } finally {
      setStudentsLoading(false);
    }
  }

  // Copy code helper
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Class CRUD Handlers
  const handleOpenCreateClass = () => {
    setClassNameInput("");
    setClassDescInput("");
    setClassSubjectInput("");
    setClassGradeInput("");
    setClassTeacherIdInput(userProfile?.uid || "");
    setClassTeacherNameInput(userProfile?.name || "");
    setShowCreateClassModal(true);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameInput.trim() || !userProfile?.uid) return;

    setSavingAction(true);
    try {
      const selectedTid = classTeacherIdInput || userProfile.uid;
      const selectedTname = classTeacherNameInput || userProfile.name || "";
      const initialTeacherIds = Array.from(new Set([userProfile.uid, selectedTid]));

      const created = await createClass(
        classNameInput.trim(),
        selectedTid,
        classDescInput.trim(),
        {
          subject: classSubjectInput.trim(),
          grade: classGradeInput.trim(),
          teacherName: selectedTname,
          teacherIds: initialTeacherIds,
        }
      );
      setShowCreateClassModal(false);
      setClassNameInput("");
      setClassDescInput("");
      setClassSubjectInput("");
      setClassGradeInput("");
      await loadClasses();
      setActiveClass(created);
    } catch (err: any) {
      alert("Lỗi tạo lớp: " + err.message);
    } finally {
      setSavingAction(false);
    }
  };

  const handleOpenEditClass = (cls: ClassRoom) => {
    setEditingClass(cls);
    setClassNameInput(cls.name);
    setClassDescInput(cls.description || "");
    setClassSubjectInput(cls.subject || "");
    setClassGradeInput(cls.grade || "");
    setClassTeacherIdInput(cls.teacherId || userProfile?.uid || "");
    setClassTeacherNameInput(cls.teacherName || userProfile?.name || "");
    setShowEditClassModal(true);
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !classNameInput.trim()) return;

    setSavingAction(true);
    try {
      const selectedTid = classTeacherIdInput || editingClass.teacherId;
      const selectedTname = classTeacherNameInput || editingClass.teacherName;
      const updatedTeacherIds = Array.from(
        new Set([...(editingClass.teacherIds || []), selectedTid])
      );

      await updateClass(editingClass.id, {
        name: classNameInput.trim(),
        description: classDescInput.trim(),
        subject: classSubjectInput.trim(),
        grade: classGradeInput.trim(),
        teacherId: selectedTid,
        teacherName: selectedTname,
        teacherIds: updatedTeacherIds,
      });
      setShowEditClassModal(false);
      setEditingClass(null);
      await loadClasses();
    } catch (err: any) {
      alert("Lỗi cập nhật lớp: " + err.message);
    } finally {
      setSavingAction(false);
    }
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !teacherToAssignId) return;

    const teacherObj = allTeachers.find((t) => t.uid === teacherToAssignId);
    if (!teacherObj) return;

    setAssigningTeacher(true);
    try {
      await assignTeacherToClass(activeClass.id, teacherObj.uid, teacherObj.name);
      const updatedIds = Array.from(
        new Set([...(activeClass.teacherIds || [activeClass.teacherId]), teacherObj.uid])
      );
      setActiveClass({
        ...activeClass,
        teacherIds: updatedIds,
      });
      setTeacherToAssignId("");
      await loadClasses();
      alert(`Đã phân công giáo viên "${teacherObj.name}" vào phụ trách lớp "${activeClass.name}" thành công!`);
    } catch (err: any) {
      alert("Lỗi phân công giáo viên: " + err.message);
    } finally {
      setAssigningTeacher(false);
    }
  };

  const handleRemoveTeacher = async (teacherId: string, teacherName: string) => {
    if (!activeClass) return;
    if (activeClass.teacherId === teacherId && (activeClass.teacherIds?.length || 1) <= 1) {
      alert("Không thể xóa giáo viên phụ trách duy nhất của lớp!");
      return;
    }
    if (!confirm(`Bạn có chắc muốn bỏ quyền phụ trách lớp của giáo viên "${teacherName}"?`)) return;

    try {
      await removeTeacherFromClass(activeClass.id, teacherId);
      const updatedIds = (activeClass.teacherIds || []).filter((id) => id !== teacherId);
      setActiveClass({
        ...activeClass,
        teacherIds: updatedIds,
      });
      await loadClasses();
    } catch (err: any) {
      alert("Lỗi xóa quyền giáo viên: " + err.message);
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa lớp "${className}"?\nToàn bộ dữ liệu học sinh trong lớp sẽ được dọn dẹp khỏi lớp này.`
      )
    ) {
      return;
    }
    try {
      await deleteClass(classId);
      if (activeClass?.id === classId) {
        setActiveClass(null);
      }
      await loadClasses();
    } catch (err: any) {
      alert("Lỗi xóa lớp: " + err.message);
    }
  };

  // Student CRUD Handlers
  const handleOpenAddStudent = async () => {
    setManualName("");
    setManualEmail("");
    setManualCode("");
    setManualDob("");
    setUserSearchTerm("");
    setUserSearchResults([]);
    setBatchText("");
    setSelectedStudentUids([]);
    setAdminStudentSearch("");
    setAddStudentTab("adminGroup");
    setShowAddStudentModal(true);

    // Tự động tải danh sách các lớp sinh hoạt hành chính từ CSDL chung
    try {
      const distinctList = await getDistinctStudentClasses();
      setAdminClasses(distinctList);
      if (distinctList.length > 0) {
        // Ưu tiên chọn lớp có tên xuất hiện trong tên lớp bộ môn hiện tại
        const matched = distinctList.find((c) => activeClass?.name?.toLowerCase().includes(c.className.toLowerCase()));
        const defaultClass = matched ? matched.className : distinctList[0].className;
        setSelectedAdminClass(defaultClass);
        loadAdminClassStudents(defaultClass);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách lớp sinh hoạt:", err);
    }
  };

  const loadAdminClassStudents = async (className: string) => {
    if (!className) {
      setAdminClassStudents([]);
      return;
    }
    setLoadingAdminStudents(true);
    try {
      const list = await getAllStudents({ className });
      setAdminClassStudents(list);
      // Mặc định chọn tất cả học sinh chưa có trong lớp bộ môn này
      const currentStudentIds = new Set(students.map((s) => s.studentId));
      const notYetEnrolled = list.filter((s) => !currentStudentIds.has(s.uid)).map((s) => s.uid);
      setSelectedStudentUids(notYetEnrolled);
    } catch (err) {
      console.error("Lỗi tải học sinh theo lớp sinh hoạt:", err);
    } finally {
      setLoadingAdminStudents(false);
    }
  };

  const handleToggleSelectAllAdminStudents = () => {
    const currentStudentIds = new Set(students.map((s) => s.studentId));
    const eligibleStudents = adminClassStudents.filter((s) => !currentStudentIds.has(s.uid));
    if (selectedStudentUids.length === eligibleStudents.length) {
      setSelectedStudentUids([]);
    } else {
      setSelectedStudentUids(eligibleStudents.map((s) => s.uid));
    }
  };

  const handleToggleSelectStudent = (uid: string) => {
    setSelectedStudentUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleBatchAddFromAdminClass = async () => {
    if (!activeClass || selectedStudentUids.length === 0) return;
    setSavingAction(true);
    try {
      const res = await assignStudentsToClass(selectedStudentUids, activeClass.id);
      alert(`Đã thêm thành công ${res.count} học sinh của lớp ${selectedAdminClass} vào lớp ${activeClass.name}!`);
      setShowAddStudentModal(false);
      await loadStudents(activeClass.id);
      await loadClasses();
    } catch (err: any) {
      alert("Lỗi thêm học sinh: " + err.message);
    } finally {
      setSavingAction(false);
    }
  };

  // Lọc học sinh trong tab CSDL lớp sinh hoạt theo ô tìm kiếm
  const filteredAdminStudents = useMemo(() => {
    if (!adminStudentSearch.trim()) return adminClassStudents;
    const q = adminStudentSearch.trim().toLowerCase();
    return adminClassStudents.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(q)) ||
        (s.username && s.username.toLowerCase().includes(q))
    );
  }, [adminClassStudents, adminStudentSearch]);

  const handleManualAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !manualName.trim()) return;

    setSavingAction(true);
    try {
      const studentNameAdded = manualName.trim();
      await addStudentToClass(
        activeClass.id,
        {
          studentName: studentNameAdded,
          studentEmail: manualEmail.trim(),
          studentCode: manualCode.trim(),
          dob: manualDob.trim(),
        },
        userProfile?.uid
      );
      setShowAddStudentModal(false);
      setManualName("");
      setManualEmail("");
      setManualCode("");
      setManualDob("");
      await loadStudents(activeClass.id);
      await loadClasses();
      alert(`Đã thêm thành công học sinh "${studentNameAdded}" vào lớp!`);
    } catch (err: any) {
      alert("Lỗi thêm học sinh: " + err.message);
    } finally {
      setSavingAction(false);
    }
  };

  const handleSearchRegisteredUsers = async (term: string) => {
    setUserSearchTerm(term);
    if (!term.trim()) {
      setUserSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const results = await searchRegisteredStudents(term);
      setUserSearchResults(results);
    } catch (err) {
      console.error("Tìm kiếm học sinh:", err);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleAddExistingUser = async (user: UserProfile) => {
    if (!activeClass) return;
    setSavingAction(true);
    try {
      await addStudentToClass(
        activeClass.id,
        {
          studentId: user.uid,
          studentName: user.name || "Học sinh",
          studentEmail: user.email,
          studentCode: user.studentCode,
        },
        userProfile?.uid
      );
      setUserSearchResults((prev) => prev.filter((u) => u.uid !== user.uid));
      await loadStudents(activeClass.id);
      await loadClasses();
      alert(`Đã thêm học sinh "${user.name}" vào lớp thành công!`);
    } catch (err: any) {
      alert("Lỗi thêm học sinh: " + err.message);
    } finally {
      setSavingAction(false);
    }
  };

  const handleBatchAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !batchText.trim()) return;

    const lines = batchText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    setSavingAction(true);
    try {
      let addedCount = 0;
      for (const line of lines) {
        // Expected format: Tên, Email, Mã HS, Ngày sinh (or tab/comma separated)
        const parts = line.split(/[,;\t]+/).map((p) => p.trim());
        const studentName = parts[0];
        const studentEmail = parts[1] || "";
        const studentCode = parts[2] || "";
        const dob = parts[3] || "";

        if (studentName) {
          await addStudentToClass(
            activeClass.id,
            {
              studentName,
              studentEmail,
              studentCode,
              dob,
            },
            userProfile?.uid
          );
          addedCount++;
        }
      }

      alert(`Đã thêm thành công ${addedCount} học sinh vào lớp!`);
      setShowAddStudentModal(false);
      setBatchText("");
      await loadStudents(activeClass.id);
      await loadClasses();
    } catch (err: any) {
      alert("Lỗi nhập danh sách học sinh: " + err.message);
    } finally {
      setSavingAction(false);
    }
  };

  const handleOpenEditStudent = (st: ClassStudent) => {
    setEditingStudent(st);
    setEditStudentName(st.studentName);
    setEditStudentEmail(st.studentEmail || "");
    setEditStudentCode(st.studentCode || "");
    setShowEditStudentModal(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !editingStudent || !editStudentName.trim()) return;

    setSavingAction(true);
    try {
      await updateStudentInClass(activeClass.id, editingStudent.studentId, {
        studentName: editStudentName.trim(),
        studentEmail: editStudentEmail.trim(),
        studentCode: editStudentCode.trim(),
      });
      setShowEditStudentModal(false);
      setEditingStudent(null);
      await loadStudents(activeClass.id);
    } catch (err: any) {
      alert("Lỗi cập nhật học sinh: " + err.message);
    } finally {
      setSavingAction(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!activeClass) return;
    if (!confirm(`Bạn có chắc muốn xóa học sinh "${studentName}" ra khỏi lớp này?`)) return;

    try {
      await removeStudentFromClass(activeClass.id, studentId);
      await loadStudents(activeClass.id);
      await loadClasses();
    } catch (err: any) {
      alert("Lỗi xóa học sinh: " + err.message);
    }
  };

  const handleExportStudentsExcel = async () => {
    if (!activeClass || students.length === 0) return;
    await exportClassStudentsToExcel(activeClass.name, filteredStudents);
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    const q = studentSearchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.studentName && s.studentName.toLowerCase().includes(q)) ||
        (s.studentEmail && s.studentEmail.toLowerCase().includes(q)) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(q))
    );
  }, [students, studentSearchQuery]);

  return (
    <ProtectedRoute allowedRole="teacher">
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ================= VIEW 1: QUẢN LÝ DANH SÁCH LỚP HỌC ================= */}
          {!activeClass ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                    <School className="w-7 h-7 text-indigo-600" />
                    Quản lý Lớp học phần
                  </h1>
                  <p className="text-slate-500 text-xs mt-1">
                    Tạo lớp, cấp mã 6 ký tự cho học sinh tham gia, thêm sửa xóa và quản lý danh sách học sinh cho từng lớp
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateClass}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all self-start sm:self-auto hover:scale-102"
                >
                  <Plus className="w-4 h-4" /> Thêm lớp học mới
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-16">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 mt-3 font-medium">Đang tải danh sách lớp từ hệ thống...</p>
                </div>
              ) : classes.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <School className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Chưa có lớp học phần nào</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Hãy tạo lớp học phần đầu tiên và chia sẻ mã 6 ký tự cho học sinh để bắt đầu quản lý danh sách và giao bài kiểm tra.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCreateClass}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-200"
                  >
                    <Plus className="w-4 h-4" /> Tạo lớp học ngay
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Header card */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                            <Users className="w-5 h-5" />
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditClass(cls)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Sửa thông tin lớp"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClass(cls.id, cls.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa lớp"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Badges môn học, khối & GV */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                          {cls.subject && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {cls.subject}
                            </span>
                          )}
                          {cls.grade && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {cls.grade}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            {cls.teacherName || "Chưa cập nhật"}
                            {cls.teacherIds && cls.teacherIds.length > 1 && ` (+${cls.teacherIds.length - 1})`}
                          </span>
                        </div>

                        <h3 className="font-black text-slate-900 text-lg mb-1 leading-snug group-hover:text-indigo-600 transition-colors">
                          {cls.name}
                        </h3>

                        {cls.description ? (
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                            {cls.description}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 mb-3 italic">
                            Chưa có mô tả lớp
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-400 mb-5 pb-3 border-b border-slate-100">
                          <span className="flex items-center gap-1 font-semibold text-slate-600">
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            {cls.studentCount || 0} học sinh
                          </span>
                          <span className="text-[11px]">
                            {formatDate(cls.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Join Code Box */}
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Mã tham gia lớp
                            </span>
                            <span className="font-mono text-lg font-black text-indigo-600 tracking-wider">
                              {cls.joinCode}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyCode(cls.joinCode, cls.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              copiedId === cls.id
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {copiedId === cls.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Đã chép
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Sao chép
                              </>
                            )}
                          </button>
                        </div>

                        {/* Button xem danh sách học sinh */}
                        <button
                          type="button"
                          onClick={() => setActiveClass(cls)}
                          className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                          <Users className="w-4 h-4" /> Xem & quản lý danh sách học sinh
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ================= VIEW 2: CHI TIẾT & QUẢN LÝ HỌC SINH CỦA LỚP ================= */
            <div className="space-y-6">
              {/* Breadcrumb & Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setActiveClass(null)}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors self-start"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại danh sách lớp học
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditClass(activeClass)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Sửa thông tin lớp
                  </button>

                  <button
                    type="button"
                    onClick={handleExportStudentsExcel}
                    disabled={students.length === 0}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" /> Xuất Excel (.xlsx)
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAssignTeacherModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                    title="Phân công giáo viên bộ môn phụ trách"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    Phân công GV ({activeClass.teacherIds?.length || 1})
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddStudent}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all hover:scale-102"
                  >
                    <UserPlus className="w-4 h-4" /> Thêm học sinh
                  </button>
                </div>
              </div>

              {/* Class Header Banner */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                      Lớp học phần
                    </span>
                    {activeClass.subject && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Môn: {activeClass.subject}
                      </span>
                    )}
                    {activeClass.grade && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {activeClass.grade}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      GV: {activeClass.teacherName || "Chưa cập nhật"}
                    </span>
                    <span className="text-xs text-slate-400">
                      • Tạo ngày {formatDate(activeClass.createdAt)}
                    </span>
                  </div>

                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {activeClass.name}
                  </h1>

                  {activeClass.description && (
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                      {activeClass.description}
                    </p>
                  )}
                </div>

                {/* Mã lớp & Sĩ số */}
                <div className="flex items-center gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 shrink-0">
                  <div className="text-center px-3 border-r border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Sĩ số lớp
                    </span>
                    <span className="text-2xl font-black text-slate-900">
                      {students.length}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Mã tham gia lớp
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xl font-black text-indigo-600 tracking-wider">
                        {activeClass.joinCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(activeClass.joinCode, activeClass.id)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          copiedId === activeClass.id
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                        title="Sao chép mã"
                      >
                        {copiedId === activeClass.id ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Search & Stats Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Tìm theo họ tên, email hoặc mã học sinh..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {studentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStudentSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <span className="text-xs font-bold text-slate-500">
                  Hiển thị {filteredStudents.length} / {students.length} học sinh
                </span>
              </div>

              {/* Student Table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                {studentsLoading ? (
                  <div className="flex flex-col items-center justify-center p-16">
                    <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-400 mt-3 font-medium">Đang tải danh sách học sinh...</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
                      <Users className="w-6 h-6" />
                    </div>
                    {students.length === 0 ? (
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Chưa có học sinh nào trong lớp</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Chia sẻ mã tham gia <span className="font-mono font-bold text-indigo-600">{activeClass.joinCode}</span> hoặc bấm nút bên dưới để thêm học sinh vào lớp.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                          <button
                            type="button"
                            onClick={handleOpenAddStudent}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Thêm học sinh ngay
                          </button>
                          <Link
                            to="/t/students"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" /> Phân nhóm từ trang Học sinh
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Không tìm thấy học sinh</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Không có học sinh nào khớp với từ khóa "{studentSearchQuery}".
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="py-3.5 px-6 w-14">STT</th>
                          <th className="py-3.5 px-6">Họ và tên</th>
                          <th className="py-3.5 px-4">Mã học sinh</th>
                          <th className="py-3.5 px-4">Email</th>
                          <th className="py-3.5 px-4">Ngày vào lớp</th>
                          <th className="py-3.5 px-6 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredStudents.map((st, idx) => (
                          <tr key={st.studentId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-4 px-6 text-slate-400 font-semibold">{idx + 1}</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs shrink-0">
                                  {st.studentName.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-900 text-sm">
                                  {st.studentName}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 font-mono text-slate-600 font-medium">
                              {st.studentCode ? (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                  {st.studentCode}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-slate-500">
                              {st.studentEmail ? (
                                <span className="flex items-center gap-1.5">
                                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                                  {st.studentEmail}
                                </span>
                              ) : (
                                <span className="text-slate-300 italic">Chưa cập nhật</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-slate-500">
                              {formatDate(st.joinedAt)}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditStudent(st)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Chỉnh sửa thông tin học sinh"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStudent(st.studentId, st.studentName)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Xóa khỏi lớp"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= MODAL TẠO LỚP HỌC MỚI ================= */}
          {showCreateClassModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-base">Thêm lớp học mới</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateClassModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-5">
                  Nhập thông tin lớp học. Hệ thống sẽ tự động cấp một mã ngẫu nhiên 6 ký tự để chia sẻ cho học sinh.
                </p>

                <form onSubmit={handleCreateClass} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Môn học
                      </label>
                      <select
                        value={classSubjectInput}
                        onChange={(e) => {
                          const sub = e.target.value;
                          setClassSubjectInput(sub);
                          if (!classNameInput && sub) {
                            setClassNameInput(sub);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                      >
                        <option value="">-- Chọn môn học --</option>
                        {SUBJECT_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Khối lớp
                      </label>
                      <select
                        value={classGradeInput}
                        onChange={(e) => setClassGradeInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                      >
                        <option value="">-- Chọn khối --</option>
                        {GRADE_OPTIONS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giáo viên phụ trách môn học
                    </label>
                    <select
                      value={classTeacherIdInput}
                      onChange={(e) => {
                        const tid = e.target.value;
                        setClassTeacherIdInput(tid);
                        const found = allTeachers.find((t) => t.uid === tid);
                        if (found) setClassTeacherNameInput(found.name);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                    >
                      {allTeachers.length > 0 ? (
                        allTeachers.map((t) => (
                          <option key={t.uid} value={t.uid}>
                            {t.name} ({t.email}){t.uid === userProfile?.uid ? " - (Bạn)" : ""}
                          </option>
                        ))
                      ) : (
                        <option value={userProfile?.uid || ""}>
                          {userProfile?.name || "Tôi"} ({userProfile?.email || ""})
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên lớp học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={classNameInput}
                      onChange={(e) => setClassNameInput(e.target.value)}
                      placeholder="Ví dụ: Toán 11A1, Vật lý 11A1, 10A3 - Tin học..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mô tả / Ghi chú (tùy chọn)
                    </label>
                    <textarea
                      rows={3}
                      value={classDescInput}
                      onChange={(e) => setClassDescInput(e.target.value)}
                      placeholder="Ví dụ: Năm học 2025-2026, phòng máy 2..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateClassModal(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={savingAction}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 disabled:opacity-50"
                    >
                      {savingAction ? "Đang tạo..." : "Tạo lớp học"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= MODAL SỬA THÔNG TIN LỚP HỌC ================= */}
          {showEditClassModal && editingClass && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-base">Chỉnh sửa thông tin lớp</h3>
                  <button
                    type="button"
                    onClick={() => setShowEditClassModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-5">
                  Cập nhật tên, môn học, giáo viên phụ trách và mô tả của lớp học phần.
                </p>

                <form onSubmit={handleUpdateClass} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Môn học
                      </label>
                      <select
                        value={classSubjectInput}
                        onChange={(e) => setClassSubjectInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                      >
                        <option value="">-- Chọn môn học --</option>
                        {SUBJECT_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Khối lớp
                      </label>
                      <select
                        value={classGradeInput}
                        onChange={(e) => setClassGradeInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                      >
                        <option value="">-- Chọn khối --</option>
                        {GRADE_OPTIONS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giáo viên phụ trách
                    </label>
                    <select
                      value={classTeacherIdInput}
                      onChange={(e) => {
                        const tid = e.target.value;
                        setClassTeacherIdInput(tid);
                        const found = allTeachers.find((t) => t.uid === tid);
                        if (found) setClassTeacherNameInput(found.name);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                    >
                      {allTeachers.length > 0 ? (
                        allTeachers.map((t) => (
                          <option key={t.uid} value={t.uid}>
                            {t.name} ({t.email}){t.uid === userProfile?.uid ? " - (Bạn)" : ""}
                          </option>
                        ))
                      ) : (
                        <option value={userProfile?.uid || ""}>
                          {userProfile?.name || "Tôi"} ({userProfile?.email || ""})
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên lớp học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={classNameInput}
                      onChange={(e) => setClassNameInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mô tả lớp
                    </label>
                    <textarea
                      rows={3}
                      value={classDescInput}
                      onChange={(e) => setClassDescInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowEditClassModal(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={savingAction}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 disabled:opacity-50"
                    >
                      {savingAction ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= MODAL PHÂN CÔNG GIÁO VIÊN PHỤ TRÁCH ================= */}
          {showAssignTeacherModal && activeClass && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-indigo-600" />
                    Phân công giáo viên phụ trách lớp
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAssignTeacherModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-5">
                  Lớp: <strong className="text-slate-900">{activeClass.name}</strong> ({activeClass.subject || "Chung"}).
                  Mỗi môn học có thể có giáo viên phụ trách riêng. Chỉ những giáo viên được thêm vào danh sách dưới đây mới thấy lớp này trên giao diện của mình.
                </p>

                {/* Danh sách giáo viên hiện tại */}
                <div className="space-y-2 mb-6">
                  <label className="block text-xs font-bold text-slate-700">
                    Giáo viên hiện đang phụ trách ({activeClass.teacherIds?.length || 1})
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(() => {
                      const currentIds = Array.from(
                        new Set([activeClass.teacherId, ...(activeClass.teacherIds || [])])
                      );
                      return currentIds.map((tid) => {
                        const teacherObj = allTeachers.find((t) => t.uid === tid);
                        const isCreator = tid === activeClass.teacherId;
                        const name: string =
                          teacherObj?.name ||
                          (isCreator && activeClass.teacherName ? activeClass.teacherName : "") ||
                          "Giáo viên";
                        const email = teacherObj?.email || "";
                        return (
                          <div
                            key={tid}
                            className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-xs text-slate-900 block flex items-center gap-1.5">
                                  {name}
                                  {isCreator && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      Người tạo
                                    </span>
                                  )}
                                  {tid === userProfile?.uid && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      Bạn
                                    </span>
                                  )}
                                </span>
                                {email && <span className="text-[11px] text-slate-400">{email}</span>}
                              </div>
                            </div>

                            {!isCreator && currentIds.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTeacher(tid, name)}
                                className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                Bỏ quyền
                              </button>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Form thêm giáo viên mới */}
                <form onSubmit={handleAssignTeacher} className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Thêm giáo viên bộ môn vào lớp
                    </label>
                    <select
                      value={teacherToAssignId}
                      onChange={(e) => setTeacherToAssignId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                    >
                      <option value="">-- Chọn giáo viên từ hệ thống --</option>
                      {allTeachers
                        .filter(
                          (t) =>
                            t.uid !== activeClass.teacherId &&
                            !(activeClass.teacherIds || []).includes(t.uid)
                        )
                        .map((t) => (
                          <option key={t.uid} value={t.uid}>
                            {t.name} ({t.email})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAssignTeacherModal(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={assigningTeacher || !teacherToAssignId}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 disabled:opacity-50 transition-all hover:scale-102"
                    >
                      {assigningTeacher ? "Đang thêm..." : "+ Thêm vào lớp"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= MODAL THÊM HỌC SINH VÀO LỚP ================= */}
          {showAddStudentModal && activeClass && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-base">Thêm học sinh vào lớp</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddStudentModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Lớp: <span className="font-bold text-indigo-600">{activeClass.name}</span>
                  {activeClass.subject && <span className="ml-2 font-semibold text-slate-600">• Môn: {activeClass.subject}</span>}
                </p>

                {/* Tab selector */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl mb-5">
                  <button
                    type="button"
                    onClick={() => setAddStudentTab("adminGroup")}
                    className={`flex-1 min-w-[120px] py-1.5 text-xs font-bold rounded-xl transition-all ${
                      addStudentTab === "adminGroup"
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Lọc CSDL chung
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddStudentTab("manual")}
                    className={`flex-1 min-w-[100px] py-1.5 text-xs font-bold rounded-xl transition-all ${
                      addStudentTab === "manual"
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Thêm trực tiếp
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddStudentTab("search")}
                    className={`flex-1 min-w-[110px] py-1.5 text-xs font-bold rounded-xl transition-all ${
                      addStudentTab === "search"
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tìm tài khoản
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddStudentTab("batch")}
                    className={`flex-1 min-w-[110px] py-1.5 text-xs font-bold rounded-xl transition-all ${
                      addStudentTab === "batch"
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Dán danh sách
                  </button>
                </div>

                {/* TAB 0: LỌC TỪ CSDL HỌC SINH CHUNG CỦA TRƯỜNG */}
                {addStudentTab === "adminGroup" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-900 flex items-start gap-2">
                      <Filter className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold">Lọc theo Lớp sinh hoạt hành chính từ CSDL trường</p>
                        <p className="text-[11px] text-indigo-700 mt-0.5">
                          Chọn lớp sinh hoạt (ví dụ: 11A1, 10A3...) để lấy danh sách học sinh, sau đó chọn tất cả hoặc tích chọn các học sinh cần thêm vào lớp môn học này.
                        </p>
                      </div>
                    </div>

                    {/* Dropdown chọn lớp sinh hoạt */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Lớp sinh hoạt / Khối lớp trong CSDL trường:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={selectedAdminClass}
                          onChange={(e) => {
                            setSelectedAdminClass(e.target.value);
                            loadAdminClassStudents(e.target.value);
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {adminClasses.length === 0 ? (
                            <option value="">Chưa có dữ liệu lớp học sinh</option>
                          ) : (
                            adminClasses.map((ac) => (
                              <option key={ac.className} value={ac.className}>
                                Lớp {ac.className} ({ac.count} học sinh) {ac.grade ? `- ${ac.grade}` : ""}
                              </option>
                            ))
                          )}
                        </select>

                        {/* Ô lọc tìm nhanh trong lớp sinh hoạt */}
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={adminStudentSearch}
                            onChange={(e) => setAdminStudentSearch(e.target.value)}
                            placeholder="Tìm theo tên hoặc mã HS..."
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Toolbar chọn tất cả */}
                    <div className="flex items-center justify-between py-1 px-1 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleSelectAllAdminStudents}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          <CheckSquare className="w-4 h-4" /> Chọn tất cả chưa vào lớp
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentUids([])}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Bỏ chọn
                        </button>
                      </div>

                      <span className="font-bold text-slate-600">
                        Đã chọn: <span className="text-indigo-600 font-black">{selectedStudentUids.length}</span> / {adminClassStudents.length} học sinh
                      </span>
                    </div>

                    {/* Danh sách học sinh của lớp sinh hoạt */}
                    <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                      {loadingAdminStudents ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Đang tải danh sách học sinh lớp {selectedAdminClass}...
                        </div>
                      ) : filteredAdminStudents.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-6">
                          Không có học sinh nào phù hợp.
                        </p>
                      ) : (
                        filteredAdminStudents.map((usr) => {
                          const isEnrolled = students.some((s) => s.studentId === usr.uid);
                          const isSelected = selectedStudentUids.includes(usr.uid);

                          return (
                            <div
                              key={usr.uid}
                              onClick={() => {
                                if (!isEnrolled) handleToggleSelectStudent(usr.uid);
                              }}
                              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                                isEnrolled
                                  ? "bg-slate-100/70 border-slate-200/60 opacity-60 cursor-not-allowed"
                                  : isSelected
                                  ? "bg-indigo-50/90 border-indigo-300 cursor-pointer shadow-xs"
                                  : "bg-white border-slate-200 hover:border-slate-300 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  disabled={isEnrolled}
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-slate-900">{usr.name}</span>
                                    {usr.studentCode && (
                                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                                        {usr.studentCode}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-400">
                                    {usr.username || usr.email}
                                  </span>
                                </div>
                              </div>

                              {isEnrolled ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                  Đã trong lớp
                                </span>
                              ) : isSelected ? (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                                  Đã chọn
                                </span>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Nút submit thêm học sinh đã chọn */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-500">
                        Thêm vào: <strong className="text-indigo-600">{activeClass.name}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddStudentModal(false)}
                          className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={handleBatchAddFromAdminClass}
                          disabled={savingAction || selectedStudentUids.length === 0}
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 disabled:opacity-50 transition-all hover:scale-102"
                        >
                          {savingAction
                            ? "Đang thêm..."
                            : `Thêm ${selectedStudentUids.length} học sinh đã chọn`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 1: THÊM TRỰC TIẾP */}
                {addStudentTab === "manual" && (
                  <form onSubmit={handleManualAddStudent} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Họ và tên học sinh <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn An"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mã học sinh / MSSV
                        </label>
                        <input
                          type="text"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          placeholder="VD: HS001"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Ngày sinh (DD/MM/YYYY)
                        </label>
                        <input
                          type="text"
                          value={manualDob}
                          onChange={(e) => setManualDob(e.target.value)}
                          placeholder="VD: 15/08/2008"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email (tùy chọn)
                      </label>
                      <input
                        type="email"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        placeholder="Để trống nếu muốn hệ thống tự tạo email theo mã HS"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Tự động khởi tạo tài khoản đăng nhập
                      </p>
                      <p className="text-[11px] text-indigo-700 leading-relaxed">
                        Hệ thống sẽ tự động tạo tài khoản cho học sinh với tên người dùng (theo họ tên/mã HS) và mật khẩu (theo ngày sinh ddmmyyyy hoặc mặc định 123456). Học sinh có thể dùng ngay để đăng nhập và làm bài.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAddStudentModal(false)}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={savingAction}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 disabled:opacity-50"
                      >
                        {savingAction ? "Đang thêm..." : "Thêm vào lớp"}
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB 2: TÌM TÀI KHOẢN ĐÃ CÓ */}
                {addStudentTab === "search" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tìm kiếm học sinh theo tên hoặc email
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={userSearchTerm}
                          onChange={(e) => handleSearchRegisteredUsers(e.target.value)}
                          placeholder="Nhập tên hoặc email học sinh..."
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                      {searchingUsers ? (
                        <p className="text-center text-xs text-slate-400 py-4">Đang tìm kiếm...</p>
                      ) : userSearchResults.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-4">
                          {userSearchTerm ? "Không tìm thấy tài khoản phù hợp." : "Nhập từ khóa để tìm kiếm học sinh."}
                        </p>
                      ) : (
                        userSearchResults.map((usr) => {
                          const isAlreadyIn = students.some((s) => s.studentId === usr.uid);
                          return (
                            <div
                              key={usr.uid}
                              className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3"
                            >
                              <div>
                                <span className="font-bold text-xs text-slate-900 block">{usr.name}</span>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                  {usr.studentCode && (
                                    <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                                      {usr.studentCode}
                                    </span>
                                  )}
                                  <span>{usr.email || usr.username}</span>
                                  {usr.className && (
                                    <span className="text-indigo-600 font-medium">({usr.className})</span>
                                  )}
                                </div>
                              </div>

                              {isAlreadyIn ? (
                                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                  Đã trong lớp
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddExistingUser(usr)}
                                  disabled={savingAction}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                                >
                                  + Thêm
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: NHẬP DANH SÁCH NHANH */}
                {addStudentTab === "batch" && (
                  <form onSubmit={handleBatchAddStudents} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Dán danh sách học sinh (Mỗi dòng 1 học sinh)
                      </label>
                      <textarea
                        rows={6}
                        required
                        value={batchText}
                        onChange={(e) => setBatchText(e.target.value)}
                        placeholder={`Nguyễn Văn An, an@gmail.com, HS01\nTrần Thị Bình, binh@gmail.com, HS02\nLê Hoàng Cường`}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Định dạng mỗi dòng: <code className="bg-slate-100 px-1 py-0.5 rounded">Họ tên, Email, Mã HS</code> (Email và Mã HS có thể để trống).
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAddStudentModal(false)}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={savingAction}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 disabled:opacity-50"
                      >
                        {savingAction ? "Đang xử lý..." : "Nhập hàng loạt"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ================= MODAL SỬA THÔNG TIN HỌC SINH ================= */}
          {showEditStudentModal && editingStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-base">Sửa thông tin học sinh</h3>
                  <button
                    type="button"
                    onClick={() => setShowEditStudentModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-5">
                  Cập nhật thông tin hiển thị của học sinh trong lớp học.
                </p>

                <form onSubmit={handleUpdateStudent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Họ và tên học sinh <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={editStudentName}
                      onChange={(e) => setEditStudentName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editStudentEmail}
                        onChange={(e) => setEditStudentEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mã học sinh / MSSV
                      </label>
                      <input
                        type="text"
                        value={editStudentCode}
                        onChange={(e) => setEditStudentCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowEditStudentModal(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={savingAction}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 disabled:opacity-50"
                    >
                      {savingAction ? "Đang lưu..." : "Cập nhật"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
