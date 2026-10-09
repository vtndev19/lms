import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import {
  getAllStudents,
  getClasses,
  createClass,
  createStudentUser,
  importStudentsFromCsvOrExcel,
  getStudentDetail,
  updateStudentProfile,
  deleteStudentUser,
  toggleBlockStudent,
  resetStudentPassword,
  assignStudentsToClass,
} from "../../lib/db";
import {
  exportStudentAccountsToExcel,
  downloadStudentTemplateExcel,
  downloadStudentTemplateCsv,
  parseStudentFile,
} from "../../lib/exportExcel";
import { formatDate, formatDobToPassword, generateStudentUsername } from "../../lib/utils";
import type { UserProfile, ClassRoom, StudentImportItem, Attempt } from "../../lib/types";
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Check,
  Copy,
  AlertCircle,
  School,
  Award,
  X,
  UploadCloud,
  RefreshCw,
  UserCheck,
  UserX,
  ChevronDown,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckSquare,
  Square,
} from "lucide-react";

export default function TeacherStudentsPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">("all");

  // Selection for manual grouping (Bulk actions)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Mask / Unmask passwords
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Target student for Detail / Edit / Reset / Delete / Single Assign
  const [targetStudent, setTargetStudent] = useState<UserProfile | null>(null);
  const [studentDetailData, setStudentDetailData] = useState<{
    profile: UserProfile | null;
    classes: ClassRoom[];
    attempts: Attempt[];
    stats: { totalAttempts: number; averageScore: number | null; completedExams: number };
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Manual Assign Modal State
  const [assignTargetClassId, setAssignTargetClassId] = useState("");
  const [assignNewClassName, setAssignNewClassName] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState<string | null>(null);

  // Add Single Student Form State
  const [addForm, setAddForm] = useState({
    name: "",
    studentCode: "",
    dob: "",
    className: "",
    gender: "Nam",
    phone: "",
    customPassword: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit Student Form State
  const [editForm, setEditForm] = useState({
    name: "",
    studentCode: "",
    dob: "",
    classId: "",
    gender: "",
    phone: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Reset Password State
  const [resetPassType, setResetPassType] = useState<"dob" | "custom">("dob");
  const [customNewPass, setCustomNewPass] = useState("");
  const [resetPassLoading, setResetPassLoading] = useState(false);
  const [resetPassSuccess, setResetPassSuccess] = useState<string | null>(null);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<StudentImportItem[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<{
    created: number;
    classesCreated: string[];
    errors: string[];
  } | null>(null);

  // Action Loading ID
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, classesData] = await Promise.all([
        getAllStudents(),
        getClasses(userProfile?.uid),
      ]);
      setStudents(studentsData);
      setClasses(classesData);
    } catch (err) {
      console.error("Lỗi tải danh sách học sinh / lớp học:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userProfile?.uid]);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Toggle mask password
  const toggleShowPassword = (studentId: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search
      const search = searchTerm.toLowerCase().trim();
      if (search) {
        const matchesName = s.name?.toLowerCase().includes(search);
        const matchesCode = s.studentCode?.toLowerCase().includes(search);
        const matchesUsername = s.username?.toLowerCase().includes(search);
        const matchesClass = s.className?.toLowerCase().includes(search);
        const matchesEmail = s.email?.toLowerCase().includes(search);
        if (!matchesName && !matchesCode && !matchesUsername && !matchesClass && !matchesEmail) {
          return false;
        }
      }

      // Class Filter
      if (selectedClassId !== "all") {
        if (!s.classIds?.includes(selectedClassId)) {
          return false;
        }
      }

      // Status Filter
      if (statusFilter === "active" && s.isBlocked) return false;
      if (statusFilter === "blocked" && !s.isBlocked) return false;

      return true;
    });
  }, [students, searchTerm, selectedClassId, statusFilter]);

  // Select all / Deselect all
  const isAllSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.includes(s.uid));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.uid));
    }
  };

  const toggleSelectStudent = (uid: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  // Statistics
  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => !s.isBlocked).length;
    const blocked = students.filter((s) => s.isBlocked).length;
    const classCount = classes.length;
    return { total, active, blocked, classCount };
  }, [students, classes]);

  // 1-Click Toggle Block
  const handleToggleBlock = async (student: UserProfile) => {
    const nextState = !student.isBlocked;
    const actionText = nextState ? "khóa quyền truy cập" : "mở khóa tài khoản";
    if (!confirm(`Bạn có chắc muốn ${actionText} của học sinh "${student.name}"?`)) {
      return;
    }

    try {
      setActionLoadingId(student.uid);
      await toggleBlockStudent(student.uid, nextState);
      setStudents((prev) =>
        prev.map((s) => (s.uid === student.uid ? { ...s, isBlocked: nextState } : s))
      );
      if (targetStudent?.uid === student.uid) {
        setTargetStudent((prev) => (prev ? { ...prev, isBlocked: nextState } : null));
      }
    } catch (err: any) {
      alert("Lỗi khi cập nhật trạng thái: " + (err?.message || ""));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Detail Modal
  const handleOpenDetail = async (student: UserProfile) => {
    setTargetStudent(student);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const data = await getStudentDetail(student.uid);
      setStudentDetailData(data);
    } catch (err) {
      console.error("Lỗi lấy chi tiết:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (student: UserProfile) => {
    setTargetStudent(student);
    setEditForm({
      name: student.name || "",
      studentCode: student.studentCode || "",
      dob: student.dob || "",
      classId: student.classIds?.[0] || "",
      gender: student.gender || "Nam",
      phone: student.phone || "",
    });
    setEditError("");
    setShowEditModal(true);
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent) return;
    if (!editForm.name.trim()) {
      setEditError("Vui lòng nhập họ tên học sinh.");
      return;
    }

    setEditLoading(true);
    setEditError("");
    try {
      const oldClassId = targetStudent.classIds?.[0];
      await updateStudentProfile(
        targetStudent.uid,
        {
          name: editForm.name.trim(),
          studentCode: editForm.studentCode.trim().toUpperCase(),
          dob: editForm.dob.trim(),
          gender: editForm.gender,
          phone: editForm.phone.trim(),
        },
        editForm.classId || undefined,
        oldClassId
      );

      await loadData();
      setShowEditModal(false);
    } catch (err: any) {
      setEditError(err?.message || "Lỗi cập nhật học sinh");
    } finally {
      setEditLoading(false);
    }
  };

  // Open Reset Pass Modal
  const handleOpenResetPass = (student: UserProfile) => {
    setTargetStudent(student);
    setResetPassType("dob");
    setCustomNewPass("");
    setResetPassSuccess(null);
    setShowResetPassModal(true);
  };

  // Submit Reset Pass
  const handleConfirmResetPass = async () => {
    if (!targetStudent) return;
    setResetPassLoading(true);
    try {
      let newPass: string | undefined = undefined;
      if (resetPassType === "custom") {
        if (!customNewPass.trim()) {
          alert("Vui lòng nhập mật khẩu mới.");
          setResetPassLoading(false);
          return;
        }
        newPass = customNewPass.trim();
      }

      const generated = await resetStudentPassword(targetStudent.uid, newPass);
      setResetPassSuccess(generated);
      setStudents((prev) =>
        prev.map((s) => (s.uid === targetStudent.uid ? { ...s, initialPassword: generated } : s))
      );
    } catch (err: any) {
      alert("Lỗi đặt lại mật khẩu: " + (err?.message || ""));
    } finally {
      setResetPassLoading(false);
    }
  };

  // Delete Student
  const handleOpenDelete = (student: UserProfile) => {
    setTargetStudent(student);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetStudent) return;
    setActionLoadingId(targetStudent.uid);
    try {
      await deleteStudentUser(targetStudent.uid);
      setStudents((prev) => prev.filter((s) => s.uid !== targetStudent.uid));
      setShowDeleteConfirmModal(false);
      setTargetStudent(null);
    } catch (err: any) {
      alert("Lỗi khi xóa học sinh: " + (err?.message || ""));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Manual Assign Modal (Bulk or Single)
  const handleOpenAssignModal = (singleStudent?: UserProfile) => {
    if (singleStudent) {
      setSelectedStudentIds([singleStudent.uid]);
      setTargetStudent(singleStudent);
    } else {
      setTargetStudent(null);
    }
    setAssignTargetClassId(classes[0]?.id || "");
    setAssignNewClassName("");
    setAssignSuccessMsg(null);
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async () => {
    if (selectedStudentIds.length === 0) {
      alert("Vui lòng chọn ít nhất một học sinh để phân nhóm.");
      return;
    }

    setAssignLoading(true);
    try {
      let finalClassId = assignTargetClassId;

      // Nếu giáo viên chọn tạo lớp mới
      if (assignTargetClassId === "new") {
        if (!assignNewClassName.trim()) {
          alert("Vui lòng nhập tên lớp học mới.");
          setAssignLoading(false);
          return;
        }
        const created = await createClass(
          assignNewClassName.trim(),
          userProfile?.uid || "",
          "Lớp học tạo từ phân nhóm học sinh"
        );
        finalClassId = created.id;
      }

      const result = await assignStudentsToClass(selectedStudentIds, finalClassId);
      setAssignSuccessMsg(
        `Đã phân nhóm thành công ${result.count} học sinh vào lớp "${result.className}"!`
      );

      // Reload dữ liệu
      await loadData();
      setSelectedStudentIds([]);
    } catch (err: any) {
      alert("Lỗi phân nhóm học sinh: " + (err?.message || ""));
    } finally {
      setAssignLoading(false);
    }
  };

  // Submit Add Single Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      setAddError("Vui lòng nhập họ và tên học sinh.");
      return;
    }

    setAddLoading(true);
    setAddError("");
    try {
      const newStudent = await createStudentUser(
        {
          name: addForm.name.trim(),
          studentCode: addForm.studentCode.trim().toUpperCase(),
          dob: addForm.dob.trim(),
          className: addForm.className.trim(),
          gender: addForm.gender,
          phone: addForm.phone.trim(),
          password: addForm.customPassword.trim() || undefined,
        },
        userProfile?.uid
      );

      setStudents((prev) => [newStudent, ...prev]);
      setShowAddModal(false);
      setAddForm({
        name: "",
        studentCode: "",
        dob: "",
        className: "",
        gender: "Nam",
        phone: "",
        customPassword: "",
      });
      getClasses(userProfile?.uid).then(setClasses);
    } catch (err: any) {
      setAddError(err?.message || "Lỗi khi thêm học sinh.");
    } finally {
      setAddLoading(false);
    }
  };

  // Handle File Upload for Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportError("");
    setImportResult(null);
    try {
      const items = await parseStudentFile(file);
      if (items.length === 0) {
        setImportError("File không có dữ liệu hoặc không đọc được cột Họ tên / Mã học sinh.");
        setImportPreview([]);
      } else {
        setImportPreview(items);
      }
    } catch (err: any) {
      setImportError(err?.message || "Lỗi đọc file. Vui lòng kiểm tra lại định dạng.");
      setImportPreview([]);
    }
  };

  // Submit Import
  const handleConfirmImport = async () => {
    if (!importPreview.length || !userProfile?.uid) return;
    setImportLoading(true);
    setImportError("");
    try {
      const res = await importStudentsFromCsvOrExcel(importPreview, userProfile.uid);
      setImportResult({
        created: res.created,
        classesCreated: res.classesCreated,
        errors: res.errors,
      });

      await loadData();
    } catch (err: any) {
      setImportError(err?.message || "Lỗi trong quá trình nhập danh sách.");
    } finally {
      setImportLoading(false);
    }
  };

  // Live preview credentials in Add Single Modal
  const previewUsername = useMemo(() => {
    if (!addForm.name.trim() && !addForm.studentCode.trim()) return "—";
    return generateStudentUsername(addForm.name, addForm.studentCode);
  }, [addForm.name, addForm.studentCode]);

  const previewPassword = useMemo(() => {
    if (addForm.customPassword.trim()) return addForm.customPassword.trim();
    if (addForm.dob.trim()) return formatDobToPassword(addForm.dob);
    return "123456";
  }, [addForm.customPassword, addForm.dob]);

  return (
    <ProtectedRoute allowedRole="teacher">
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Top Header Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Quản lý học sinh & Tài khoản
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tạo tài khoản học sinh, tự động/thủ công phân nhóm về từng lớp, kiểm tra sĩ số và quản lý quyền truy cập.
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/t/classes"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition shadow-2xs"
                title="Mở màn hình lớp học để kiểm tra danh sách học sinh theo lớp"
              >
                <School className="w-4 h-4" />
                Kiểm tra theo lớp
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </Link>

              <button
                onClick={() => {
                  setShowImportModal(true);
                  setImportFile(null);
                  setImportPreview([]);
                  setImportResult(null);
                  setImportError("");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Nhập CSV / Excel
              </button>

              <button
                onClick={() => {
                  setShowAddModal(true);
                  setAddError("");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                Thêm học sinh
              </button>

              <div className="relative group">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition shadow-2xs"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  Mẫu / Xuất file
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 hidden group-hover:block z-30">
                  <button
                    onClick={downloadStudentTemplateExcel}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    Tải mẫu Excel (.xlsx)
                  </button>
                  <button
                    onClick={downloadStudentTemplateCsv}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    Tải mẫu CSV (.csv)
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => exportStudentAccountsToExcel(students)}
                    disabled={students.length === 0}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                    Xuất danh sách tài khoản
                  </button>
                </div>
              </div>

              <button
                onClick={loadData}
                title="Làm mới dữ liệu"
                className="p-2 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Tổng số học sinh</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Đang hoạt động</p>
                <p className="text-xl font-black text-emerald-600 mt-0.5">{stats.active}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Tài khoản bị khóa</p>
                <p className="text-xl font-black text-rose-600 mt-0.5">{stats.blocked}</p>
              </div>
            </div>

            <Link
              to="/t/classes"
              className="bg-white hover:bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 group-hover:scale-105 transition-transform">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Lớp học phụ trách</p>
                  <p className="text-xl font-black text-indigo-600 mt-0.5">{stats.classCount}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors mr-1" />
            </Link>
          </div>

          {/* Search, Filter & Bulk Grouping Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm họ tên, mã HS, username..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <School className="w-3.5 h-3.5 text-indigo-500" />
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="all">Tất cả lớp học</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.studentCount || 0} HS)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="blocked">Đã bị khóa</option>
                  </select>
                </div>

                {(searchTerm || selectedClassId !== "all" || statusFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedClassId("all");
                      setStatusFilter("all");
                    }}
                    className="px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Selection Action Bar */}
            {selectedStudentIds.length > 0 && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  Đã chọn {selectedStudentIds.length} học sinh
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAssignModal()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Phân nhóm vào lớp
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds([])}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs font-medium">Đang tải danh sách học sinh...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-base font-bold text-slate-800">
                  Không tìm thấy học sinh nào phù hợp
                </p>
                <p className="text-xs mt-1 text-slate-400">
                  {students.length === 0
                    ? "Hãy thêm học sinh mới hoặc nhập từ file Excel / CSV."
                    : "Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc."}
                </p>
                {students.length === 0 && (
                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition"
                    >
                      Nhập từ file CSV/Excel
                    </button>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition"
                    >
                      Thêm học sinh mới
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          title="Chọn tất cả"
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3 w-10 text-center font-bold">STT</th>
                      <th className="py-3 px-4 font-bold">Học sinh</th>
                      <th className="py-3 px-4 font-bold">Mã HS & Đăng nhập</th>
                      <th className="py-3 px-4 font-bold">Mật khẩu ban đầu</th>
                      <th className="py-3 px-4 font-bold">Lớp phân nhóm</th>
                      <th className="py-3 px-4 font-bold">Ngày sinh</th>
                      <th className="py-3 px-4 font-bold">Trạng thái</th>
                      <th className="py-3 px-4 text-right font-bold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((st, index) => {
                      const isShowPass = showPasswordMap[st.uid];
                      const initialPass =
                        st.initialPassword || formatDobToPassword(st.dob) || "123456";
                      const studentUsername =
                        st.username || (st.studentCode ? st.studentCode.toLowerCase() : "—");
                      const isSelected = selectedStudentIds.includes(st.uid);

                      return (
                        <tr
                          key={st.uid}
                          className={`hover:bg-slate-50/90 transition-colors ${
                            isSelected
                              ? "bg-indigo-50/40"
                              : st.isBlocked
                              ? "bg-rose-50/30"
                              : ""
                          }`}
                        >
                          {/* Checkbox selection */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectStudent(st.uid)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>

                          {/* STT */}
                          <td className="py-3 px-3 text-center text-slate-400 font-medium">
                            {index + 1}
                          </td>

                          {/* Student Info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                                {st.name ? st.name.charAt(0) : "H"}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-tight">
                                  {st.name}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {st.phone ? st.phone : st.email || "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Student Code & Username */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold">
                                  {st.studentCode || "—"}
                                </span>
                                {st.studentCode && (
                                  <button
                                    onClick={() => handleCopy(st.studentCode!, `code-${st.uid}`)}
                                    title="Sao chép mã học sinh"
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    {copiedKey === `code-${st.uid}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">
                                User: <span className="font-mono font-medium text-slate-700">{studentUsername}</span>
                              </p>
                            </div>
                          </td>

                          {/* Initial Password */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-medium">
                                {isShowPass ? initialPass : "••••••••"}
                              </span>
                              <button
                                onClick={() => toggleShowPassword(st.uid)}
                                title={isShowPass ? "Ẩn" : "Hiện"}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                              >
                                {isShowPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleCopy(initialPass, `pass-${st.uid}`)}
                                title="Sao chép mật khẩu"
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                              >
                                {copiedKey === `pass-${st.uid}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Class Name & Direct Link */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {st.className ? (
                                <Link
                                  to="/t/classes"
                                  title="Xem lớp học trong mục Quản lý lớp"
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition"
                                >
                                  <School className="w-3 h-3 text-indigo-600" />
                                  {st.className}
                                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                </Link>
                              ) : (
                                <button
                                  onClick={() => handleOpenAssignModal(st)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition"
                                >
                                  + Xếp lớp
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Date of Birth */}
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {st.dob || "—"}
                          </td>

                          {/* Account Status Badge */}
                          <td className="py-3 px-4">
                            {st.isBlocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                <Lock className="w-3 h-3" />
                                Bị khóa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3" />
                                Hoạt động
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenAssignModal(st)}
                                title="Phân nhóm / Đổi lớp học"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <Layers className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenDetail(st)}
                                title="Xem chi tiết & lịch sử làm bài thi"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(st)}
                                title="Chỉnh sửa thông tin"
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenResetPass(st)}
                                title="Đặt lại mật khẩu"
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleToggleBlock(st)}
                                disabled={actionLoadingId === st.uid}
                                title={st.isBlocked ? "Mở khóa tài khoản" : "Khóa quyền truy cập"}
                                className={`p-1.5 rounded-lg transition ${
                                  st.isBlocked
                                    ? "text-emerald-600 hover:bg-emerald-50"
                                    : "text-rose-600 hover:bg-rose-50"
                                }`}
                              >
                                {st.isBlocked ? (
                                  <Unlock className="w-3.5 h-3.5" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                onClick={() => handleOpenDelete(st)}
                                disabled={actionLoadingId === st.uid}
                                title="Xóa học sinh"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* MODAL 1: PHÂN NHÓM HỌC SINH VỀ TỪNG LỚP */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Phân nhóm học sinh về lớp
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Gán {selectedStudentIds.length} học sinh vào lớp học được chỉ định.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {assignSuccessMsg ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-emerald-800">{assignSuccessMsg}</p>
                  <div className="pt-2 flex justify-center gap-2">
                    <Link
                      to="/t/classes"
                      className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <School className="w-3.5 h-3.5" />
                      Kiểm tra danh sách trong Lớp học
                    </Link>
                    <button
                      onClick={() => setShowAssignModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {/* Selected students preview chip */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Học sinh được phân nhóm ({selectedStudentIds.length}):
                    </span>
                    <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1 pt-1">
                      {students
                        .filter((s) => selectedStudentIds.includes(s.uid))
                        .map((s) => (
                          <span
                            key={s.uid}
                            className="inline-flex items-center gap-1 text-[11px] font-medium bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700"
                          >
                            {s.name} ({s.studentCode || "—"})
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Destination Class selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Chọn lớp học đích:
                    </label>
                    <select
                      value={assignTargetClassId}
                      onChange={(e) => setAssignTargetClassId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Lớp {c.name} (Hiện có {c.studentCount || 0} học sinh)
                        </option>
                      ))}
                      <option value="new">+ Tạo một lớp mới và gán học sinh vào...</option>
                    </select>
                  </div>

                  {/* New class name input if selected 'new' */}
                  {assignTargetClassId === "new" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tên lớp học mới: <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 10A1, 11B2..."
                        value={assignNewClassName}
                        onChange={(e) => setAssignNewClassName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={assignLoading}
                      onClick={handleConfirmAssign}
                      className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {assignLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      {assignLoading ? "Đang phân nhóm..." : "Xác nhận phân nhóm"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 2: THÊM HỌC SINH THỦ CÔNG */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Thêm học sinh mới</h3>
                    <p className="text-[11px] text-slate-500">
                      Tạo tài khoản và gán lớp học trực tiếp cho học sinh
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {addError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddStudent} className="mt-4 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Họ và tên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn An"
                      value={addForm.name}
                      onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mã học sinh
                    </label>
                    <input
                      type="text"
                      placeholder="HS001"
                      value={addForm.studentCode}
                      onChange={(e) => setAddForm({ ...addForm, studentCode: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày sinh (dd/MM/yyyy)
                    </label>
                    <input
                      type="text"
                      placeholder="15/08/2008"
                      value={addForm.dob}
                      onChange={(e) => setAddForm({ ...addForm, dob: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lớp học
                    </label>
                    <input
                      type="text"
                      placeholder="10A1 (tự tạo nếu chưa có)"
                      list="class-list-suggest"
                      value={addForm.className}
                      onChange={(e) => setAddForm({ ...addForm, className: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <datalist id="class-list-suggest">
                      {classes.map((c) => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giới tính
                    </label>
                    <select
                      value={addForm.gender}
                      onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      placeholder="0912345678"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Live Credentials Preview Box */}
                <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-1">
                  <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-600" />
                    Tài khoản hệ thống tự sinh:
                  </p>
                  <div className="grid grid-cols-2 text-xs text-slate-600">
                    <div>
                      Tên đăng nhập:{" "}
                      <span className="font-mono font-bold text-indigo-700">
                        {previewUsername}
                      </span>
                    </div>
                    <div>
                      Mật khẩu:{" "}
                      <span className="font-mono font-bold text-indigo-700">
                        {previewPassword}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    * Mật khẩu mặc định tự động lấy theo ngày sinh dạng <code className="font-mono">ddMMyyyy</code> hoặc 123456.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                  >
                    {addLoading ? "Đang tạo..." : "Tạo học sinh"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: NHẬP DANH SÁCH TỪ FILE (CSV / EXCEL) */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Nhập danh sách học sinh từ File
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Hỗ trợ file CSV (.csv) và Excel (.xlsx). Hệ thống tự tạo tài khoản và phân nhóm về từng lớp.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 py-4 space-y-4">
                {/* Dropzone */}
                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center transition bg-slate-50/60">
                  <UploadCloud className="w-10 h-10 mx-auto text-emerald-600 mb-2" />
                  <p className="text-xs font-bold text-slate-800">
                    Kéo thả hoặc nhấp để chọn file danh sách học sinh
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Các cột yêu cầu: <span className="font-semibold text-slate-700">Họ và tên, Mã học sinh, Ngày sinh, Lớp</span>
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="student-file-upload-input"
                  />
                  <div className="mt-3 flex items-center justify-center gap-3">
                    <label
                      htmlFor="student-file-upload-input"
                      className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer shadow-xs transition"
                    >
                      Chọn file máy tính
                    </label>
                    <button
                      type="button"
                      onClick={downloadStudentTemplateExcel}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải file mẫu Excel
                    </button>
                  </div>
                  {importFile && (
                    <p className="mt-2 text-xs font-bold text-emerald-600">
                      Đã chọn: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                {importError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {importError}
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <Check className="w-5 h-5 text-emerald-600" />
                      Đã tạo và phân nhóm thành công {importResult.created} tài khoản học sinh!
                    </div>
                    {importResult.classesCreated.length > 0 && (
                      <p className="text-xs text-slate-600">
                        Đã tự động tạo các lớp học mới:{" "}
                        <span className="font-bold text-slate-800">
                          {importResult.classesCreated.join(", ")}
                        </span>
                      </p>
                    )}
                    {importResult.errors.length > 0 && (
                      <div className="mt-2 text-xs text-amber-800 space-y-1">
                        <p className="font-bold">Cảnh báo một số dòng lỗi:</p>
                        <ul className="list-disc list-inside">
                          {importResult.errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview Table */}
                {importPreview.length > 0 && !importResult && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Xem trước dữ liệu ({importPreview.length} học sinh)</span>
                      <span className="text-slate-500 font-normal">
                        Mật khẩu tự sinh: ngày sinh (ddMMyyyy)
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-600 sticky top-0">
                          <tr>
                            <th className="py-2 px-3">STT</th>
                            <th className="py-2 px-3">Họ và tên</th>
                            <th className="py-2 px-3">Mã HS</th>
                            <th className="py-2 px-3">Lớp</th>
                            <th className="py-2 px-3">Ngày sinh</th>
                            <th className="py-2 px-3">Tên đăng nhập</th>
                            <th className="py-2 px-3">Mật khẩu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importPreview.map((item, idx) => {
                            const genUser = generateStudentUsername(item.name, item.studentCode);
                            const genPass = formatDobToPassword(item.dob);
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                                <td className="py-2 px-3 font-bold text-slate-900">
                                  {item.name || "—"}
                                </td>
                                <td className="py-2 px-3 font-mono">{item.studentCode || "—"}</td>
                                <td className="py-2 px-3">
                                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                                    {item.className || "Chưa có"}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-600">{item.dob || "—"}</td>
                                <td className="py-2 px-3 font-mono text-emerald-600 font-medium">
                                  {genUser}
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-600">
                                  {genPass}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Đóng
                </button>

                {importPreview.length > 0 && !importResult && (
                  <button
                    onClick={handleConfirmImport}
                    disabled={importLoading}
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {importLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {importLoading
                      ? "Đang lưu tài khoản & phân nhóm..."
                      : `Xác nhận nhập ${importPreview.length} học sinh`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: XEM CHI TIẾT HỌC SINH */}
        {showDetailModal && targetStudent && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm uppercase">
                    {targetStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {targetStudent.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Mã HS: {targetStudent.studentCode || "—"} • Username: {targetStudent.username || "—"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 py-4 space-y-4">
                {/* Profile Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Lớp phân nhóm:</span>
                    <span className="font-bold text-indigo-700">
                      {targetStudent.className || "Chưa xếp lớp"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Ngày sinh:</span>
                    <span className="font-bold text-slate-800">
                      {targetStudent.dob || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Giới tính:</span>
                    <span className="font-bold text-slate-800">
                      {targetStudent.gender || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Số điện thoại:</span>
                    <span className="font-bold text-slate-800">
                      {targetStudent.phone || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Email hệ thống:</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {targetStudent.email || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Trạng thái:</span>
                    {targetStudent.isBlocked ? (
                      <span className="text-rose-600 font-bold">Đã khóa</span>
                    ) : (
                      <span className="text-emerald-600 font-bold">Đang hoạt động</span>
                    )}
                  </div>
                </div>

                {/* Exam Submissions & History */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    Lịch sử làm bài thi & Kết quả
                  </h4>

                  {detailLoading ? (
                    <div className="py-8 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      Đang tải kết quả thi...
                    </div>
                  ) : !studentDetailData?.attempts || studentDetailData.attempts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                      Học sinh này chưa tham gia bài thi nào trên hệ thống.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                          <p className="text-slate-500 text-[11px]">Lượt thi</p>
                          <p className="text-sm font-bold text-blue-600">
                            {studentDetailData.stats.totalAttempts}
                          </p>
                        </div>
                        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-slate-500 text-[11px]">Bài đã nộp</p>
                          <p className="text-sm font-bold text-emerald-600">
                            {studentDetailData.stats.completedExams}
                          </p>
                        </div>
                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                          <p className="text-slate-500 text-[11px]">Điểm TB</p>
                          <p className="text-sm font-bold text-amber-600">
                            {studentDetailData.stats.averageScore !== null
                              ? studentDetailData.stats.averageScore
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-500 font-bold">
                            <tr>
                              <th className="py-2 px-3">Mã đề / Tiêu đề</th>
                              <th className="py-2 px-3">Lần thi</th>
                              <th className="py-2 px-3">Điểm</th>
                              <th className="py-2 px-3">Thời điểm nộp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {studentDetailData.attempts.map((att) => (
                              <tr key={att.id}>
                                <td className="py-2 px-3 font-medium text-slate-800">
                                  {(att as any).examTitle || att.examId}
                                </td>
                                <td className="py-2 px-3">Lần {att.attemptNo || 1}</td>
                                <td className="py-2 px-3 font-bold text-emerald-600">
                                  {att.score !== null && att.score !== undefined ? att.score : "—"} / {att.maxScore || 10}
                                </td>
                                <td className="py-2 px-3 text-slate-500">
                                  {formatDate(att.submittedAt || att.startedAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleToggleBlock(targetStudent)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition ${
                    targetStudent.isBlocked
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-rose-600 hover:bg-rose-700 text-white"
                  }`}
                >
                  {targetStudent.isBlocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      Mở khóa tài khoản
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      Khóa quyền truy cập
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: CHỈNH SỬA HỌC SINH */}
        {showEditModal && targetStudent && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Chỉnh sửa thông tin học sinh
                  </h3>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {editError}
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Họ và tên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mã học sinh
                    </label>
                    <input
                      type="text"
                      value={editForm.studentCode}
                      onChange={(e) => setEditForm({ ...editForm, studentCode: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày sinh (dd/MM/yyyy)
                    </label>
                    <input
                      type="text"
                      value={editForm.dob}
                      onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Chuyển lớp học
                    </label>
                    <select
                      value={editForm.classId}
                      onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="">-- Chưa xếp lớp --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Lớp {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giới tính
                    </label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                  >
                    {editLoading ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 6: ĐẶT LẠI MẬT KHẨU */}
        {showResetPassModal && targetStudent && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                    <Key className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Đặt lại mật khẩu học sinh
                  </h3>
                </div>
                <button
                  onClick={() => setShowResetPassModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-xs text-slate-600">
                  Học sinh: <strong className="text-slate-800">{targetStudent.name}</strong> (Mã HS: {targetStudent.studentCode || "—"})
                </p>

                {resetPassSuccess ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                    <p className="text-xs text-emerald-800 font-bold">
                      Đã đặt lại mật khẩu thành công!
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-base font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">
                        {resetPassSuccess}
                      </span>
                      <button
                        onClick={() => handleCopy(resetPassSuccess, "modal-copy-pass")}
                        className="p-1 text-slate-500 hover:text-slate-800"
                      >
                        {copiedKey === "modal-copy-pass" ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="passType"
                          checked={resetPassType === "dob"}
                          onChange={() => setResetPassType("dob")}
                          className="text-indigo-600"
                        />
                        <span>
                          Khôi phục theo ngày sinh (dạng{" "}
                          <strong className="font-mono text-indigo-700">
                            {formatDobToPassword(targetStudent.dob)}
                          </strong>
                          )
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="passType"
                          checked={resetPassType === "custom"}
                          onChange={() => setResetPassType("custom")}
                          className="text-indigo-600"
                        />
                        <span>Đặt mật khẩu mới tùy chọn</span>
                      </label>
                    </div>

                    {resetPassType === "custom" && (
                      <div>
                        <input
                          type="text"
                          placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                          value={customNewPass}
                          onChange={(e) => setCustomNewPass(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowResetPassModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  {resetPassSuccess ? "Đóng" : "Hủy"}
                </button>

                {!resetPassSuccess && (
                  <button
                    onClick={handleConfirmResetPass}
                    disabled={resetPassLoading}
                    className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                  >
                    {resetPassLoading ? "Đang xử lý..." : "Xác nhận đặt lại"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 7: XÁC NHẬN XÓA HỌC SINH */}
        {showDeleteConfirmModal && targetStudent && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Xóa tài khoản học sinh?
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Bạn có chắc chắn muốn xóa học sinh{" "}
                <strong className="text-slate-800">
                  {targetStudent.name}
                </strong>{" "}
                (Mã: {targetStudent.studentCode || "—"})? Học sinh sẽ bị loại khỏi các lớp học liên quan.
              </p>

              <div className="flex justify-center gap-2 mt-5">
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={actionLoadingId === targetStudent.uid}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {actionLoadingId === targetStudent.uid ? "Đang xóa..." : "Xóa vĩnh viễn"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
