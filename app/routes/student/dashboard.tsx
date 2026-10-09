import React, { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import {
  getExams,
  getClasses,
  getStudentClasses,
  getClassById,
  getClassStudents,
  getAttemptsByExamId,
} from "../../lib/db";
import type { Exam, ClassRoom, ClassStudent, Attempt } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import {
  BookOpen,
  PlusCircle,
  Clock,
  Layers,
  Award,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Sparkles,
  Users,
  GraduationCap,
  School,
  Search,
  ChevronRight,
  AlertCircle,
  Check,
  Filter,
  User,
  Eye,
  RefreshCw,
  FolderOpen,
} from "lucide-react";

// Hàm hỗ trợ màu sắc & biểu tượng theo từng môn học
function getSubjectTheme(subject?: string, name?: string) {
  const text = `${subject || ""} ${name || ""}`.toLowerCase();
  if (text.includes("toán")) {
    return {
      label: "Toán học",
      icon: "📐",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      accentBg: "bg-blue-600",
      lightBg: "bg-blue-50/60",
      borderHover: "hover:border-blue-300",
    };
  }
  if (text.includes("lý") || text.includes("vật lí") || text.includes("vật lý")) {
    return {
      label: "Vật lý",
      icon: "⚡",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      accentBg: "bg-purple-600",
      lightBg: "bg-purple-50/60",
      borderHover: "hover:border-purple-300",
    };
  }
  if (text.includes("hóa")) {
    return {
      label: "Hóa học",
      icon: "🧪",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      accentBg: "bg-emerald-600",
      lightBg: "bg-emerald-50/60",
      borderHover: "hover:border-emerald-300",
    };
  }
  if (text.includes("sinh")) {
    return {
      label: "Sinh học",
      icon: "🧬",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
      accentBg: "bg-green-600",
      lightBg: "bg-green-50/60",
      borderHover: "hover:border-green-300",
    };
  }
  if (text.includes("tin")) {
    return {
      label: "Tin học",
      icon: "💻",
      badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
      accentBg: "bg-cyan-600",
      lightBg: "bg-cyan-50/60",
      borderHover: "hover:border-cyan-300",
    };
  }
  if (text.includes("văn")) {
    return {
      label: "Ngữ văn",
      icon: "📖",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      accentBg: "bg-amber-600",
      lightBg: "bg-amber-50/60",
      borderHover: "hover:border-amber-300",
    };
  }
  if (text.includes("anh") || text.includes("tiếng anh")) {
    return {
      label: "Tiếng Anh",
      icon: "🌐",
      badgeClass: "bg-pink-50 text-pink-700 border-pink-200",
      accentBg: "bg-pink-600",
      lightBg: "bg-pink-50/60",
      borderHover: "hover:border-pink-300",
    };
  }
  if (text.includes("sử") || text.includes("lịch sử")) {
    return {
      label: "Lịch sử",
      icon: "🏛️",
      badgeClass: "bg-yellow-50 text-yellow-800 border-yellow-200",
      accentBg: "bg-yellow-600",
      lightBg: "bg-yellow-50/60",
      borderHover: "hover:border-yellow-300",
    };
  }
  if (text.includes("địa")) {
    return {
      label: "Địa lý",
      icon: "🌍",
      badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
      accentBg: "bg-teal-600",
      lightBg: "bg-teal-50/60",
      borderHover: "hover:border-teal-300",
    };
  }
  return {
    label: subject || "Bộ môn",
    icon: "📚",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    accentBg: "bg-indigo-600",
    lightBg: "bg-indigo-50/60",
    borderHover: "hover:border-indigo-300",
  };
}

export default function StudentDashboard() {
  const { userProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State chính
  const [loading, setLoading] = useState(true);
  const [studentClasses, setStudentClasses] = useState<ClassRoom[]>([]);
  const [allClasses, setAllClasses] = useState<ClassRoom[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attemptsMap, setAttemptsMap] = useState<Record<string, Attempt[]>>({});

  // Điều hướng xem: tab chính ('classes' | 'exams') hoặc xem chi tiết 1 lớp
  const urlClassId = searchParams.get("classId");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(urlClassId);
  const [mainTab, setMainTab] = useState<"classes" | "exams">("classes");

  // Bộ lọc bên trong danh sách lớp
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [classSearch, setClassSearch] = useState<string>("");

  // Bộ lọc bên trong danh sách bài tập
  const [examStatusFilter, setExamStatusFilter] = useState<string>("all");
  const [examSearch, setExamSearch] = useState<string>("");

  // Trạng thái bên trong Chi tiết Lớp học
  const [classActiveTab, setClassActiveTab] = useState<"exams" | "classmates">("exams");
  const [classmates, setClassmates] = useState<ClassStudent[]>([]);
  const [loadingClassmates, setLoadingClassmates] = useState(false);
  const [classmateSearch, setClassmateSearch] = useState("");

  // Đồng bộ URL parameter với selectedClassId
  useEffect(() => {
    if (urlClassId !== selectedClassId) {
      setSelectedClassId(urlClassId);
    }
  }, [urlClassId]);

  // Tải dữ liệu tổng thể
  useEffect(() => {
    async function loadData() {
      if (!userProfile?.uid) return;
      setLoading(true);
      try {
        const studentClassIds = userProfile.classIds || [];
        const [cList, allCList, eList] = await Promise.all([
          getStudentClasses(userProfile.uid, userProfile),
          getClasses(),
          getExams({ status: "published" }),
        ]);

        // Lọc các đề thi được giao cho lớp của học sinh (hoặc đề chung cho toàn trường)
        const relevantExams = eList.filter((e) => {
          if (!e.classIds || e.classIds.length === 0) return true;
          return e.classIds.some((cid) => studentClassIds.includes(cid));
        });

        setStudentClasses(cList);
        setAllClasses(allCList);
        setExams(relevantExams);

        // Lấy lịch sử làm bài thật của học sinh này từ Firestore
        const atts: Record<string, Attempt[]> = {};
        for (const e of relevantExams) {
          const eAtts = await getAttemptsByExamId(e.id);
          atts[e.id] = eAtts.filter((a) => a.studentId === userProfile.uid);
        }
        setAttemptsMap(atts);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userProfile?.uid, userProfile?.classIds, userProfile?.className]);

  // Lấy chi tiết lớp đang chọn
  const activeClass = useMemo(() => {
    if (!selectedClassId) return null;
    return (
      studentClasses.find((c) => c.id === selectedClassId) ||
      allClasses.find((c) => c.id === selectedClassId) ||
      null
    );
  }, [selectedClassId, studentClasses, allClasses]);

  // Khi chọn một lớp, tải danh sách bạn cùng lớp
  useEffect(() => {
    async function loadClassRoster() {
      if (!selectedClassId) {
        setClassmates([]);
        return;
      }
      setLoadingClassmates(true);
      try {
        const list = await getClassStudents(selectedClassId);
        setClassmates(list);
      } catch (err) {
        console.warn("Lỗi tải bạn cùng lớp:", err);
      } finally {
        setLoadingClassmates(false);
      }
    }
    loadClassRoster();
  }, [selectedClassId]);

  // Map tên lớp
  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    allClasses.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [allClasses]);

  // Danh sách các môn học độc nhất mà học sinh đang theo học
  const distinctSubjects = useMemo(() => {
    const set = new Set<string>();
    studentClasses.forEach((c) => {
      if (c.subject) set.add(c.subject.trim());
    });
    return Array.from(set).sort();
  }, [studentClasses]);

  // Lọc danh sách lớp học phần
  const filteredClasses = useMemo(() => {
    return studentClasses.filter((c) => {
      const matchSubject =
        subjectFilter === "all" ||
        (c.subject && c.subject.toLowerCase() === subjectFilter.toLowerCase());
      const matchSearch =
        !classSearch ||
        c.name.toLowerCase().includes(classSearch.toLowerCase()) ||
        (c.teacherName && c.teacherName.toLowerCase().includes(classSearch.toLowerCase())) ||
        (c.subject && c.subject.toLowerCase().includes(classSearch.toLowerCase()));
      return matchSubject && matchSearch;
    });
  }, [studentClasses, subjectFilter, classSearch]);

  // Danh sách bài tập thuộc lớp đang chọn (nếu có)
  const activeClassExams = useMemo(() => {
    if (!activeClass) return [];
    return exams.filter((e) => e.classIds && e.classIds.includes(activeClass.id));
  }, [exams, activeClass]);

  // Lọc bài tập theo trạng thái và tìm kiếm
  const getFilteredExams = (examList: Exam[]) => {
    return examList.filter((e) => {
      const studentAtts = attemptsMap[e.id] || [];
      const hasSubmitted = studentAtts.some((a) => a.status === "submitted");

      if (examStatusFilter === "pending" && hasSubmitted) return false;
      if (examStatusFilter === "completed" && !hasSubmitted) return false;

      if (examSearch) {
        const q = examSearch.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchDesc = e.description && e.description.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      return true;
    });
  };

  // Chọn lớp học để xem bài tập
  const handleSelectClass = (cls: ClassRoom) => {
    setSelectedClassId(cls.id);
    setSearchParams({ classId: cls.id });
    setClassActiveTab("exams");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Quay lại danh sách lớp học
  const handleBackToClasses = () => {
    setSelectedClassId(null);
    setSearchParams({});
    setMainTab("classes");
  };

  // Thống kê nhanh của học sinh
  const stats = useMemo(() => {
    let completed = 0;
    exams.forEach((e) => {
      if (attemptsMap[e.id]?.some((a) => a.status === "submitted")) {
        completed++;
      }
    });
    return {
      totalClasses: studentClasses.length,
      totalExams: exams.length,
      completedExams: completed,
      pendingExams: exams.length - completed,
    };
  }, [exams, attemptsMap, studentClasses]);

  return (
    <ProtectedRoute allowedRole="student">
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-500/10 mb-8 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-xs font-semibold backdrop-blur-xs">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" /> Góc học tập của Học sinh
                  </span>
                  {userProfile?.className && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-950/30 text-emerald-100 text-xs font-semibold border border-white/10">
                      <School className="w-3.5 h-3.5" /> Lớp: {userProfile.className}
                    </span>
                  )}
                  {userProfile?.studentCode && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-950/30 text-emerald-100 text-xs font-semibold border border-white/10 font-mono">
                      Mã HS: {userProfile.studentCode}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-2">
                  Xin chào, {userProfile?.name || "Học sinh"}!
                </h1>
                <p className="text-emerald-100 text-sm leading-relaxed">
                  Xem danh sách các lớp học bộ môn Toán, Lý, Hóa,... bạn đang tham gia. Bấm vào từng lớp để theo dõi bài tập, thời hạn và điểm số của thầy cô.
                </p>
              </div>

              {/* Nút tham gia lớp học */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                <Link
                  to="/s/join"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-emerald-800 font-bold text-xs shadow-md shadow-black/10 hover:bg-emerald-50 transition-all hover:scale-102"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-600" /> Tham gia lớp học phần mới
                </Link>
                <div className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-2xl bg-black/15 backdrop-blur-xs text-xs text-emerald-100 font-semibold border border-white/10">
                  <span>Lớp tham gia: <strong>{stats.totalClasses}</strong></span>
                  <span>Bài cần nộp: <strong>{stats.pendingExams}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* ===================== VIEW 1: CHI TIẾT MỘT LỚP HỌC (ACTIVE CLASS) ===================== */}
          {activeClass ? (
            <div className="space-y-6 animate-fade-in">
              {/* Thanh điều hướng quay lại & Breadcrumb */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <button
                    type="button"
                    onClick={handleBackToClasses}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-xs"
                  >
                    <ArrowLeft className="w-4 h-4" /> Danh sách tất cả lớp học
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                  <span className="text-slate-900 font-bold">{activeClass.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Mã tham gia lớp:</span>
                  <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 font-mono font-black text-indigo-700 text-xs shadow-xs tracking-wider">
                    {activeClass.joinCode}
                  </span>
                </div>
              </div>

              {/* Banner Chi tiết Lớp học */}
              {(() => {
                const theme = getSubjectTheme(activeClass.subject, activeClass.name);
                return (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border ${theme.badgeClass}`}
                          >
                            <span>{theme.icon}</span>
                            <span>{activeClass.subject || "Chung"}</span>
                          </span>

                          {activeClass.grade && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {activeClass.grade}
                            </span>
                          )}

                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            Sĩ số: {activeClass.studentCount || classmates.length} học sinh
                          </span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                          {activeClass.name}
                        </h2>

                        {activeClass.description && (
                          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                            {activeClass.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 pt-1">
                          <span className="flex items-center gap-1.5 text-slate-700">
                            <GraduationCap className="w-4 h-4 text-indigo-600" />
                            Giáo viên: <strong>{activeClass.teacherName || "Chưa cập nhật"}</strong>
                          </span>
                          <span>•</span>
                          <span>Đã giao: {activeClassExams.length} bài tập</span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-tabs bên trong Lớp học */}
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-6 mt-6">
                      <button
                        type="button"
                        onClick={() => setClassActiveTab("exams")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          classActiveTab === "exams"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        Bài tập & Đề thi ({activeClassExams.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setClassActiveTab("classmates")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          classActiveTab === "classmates"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        Bạn cùng lớp ({classmates.length})
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Nội dung Tab 1: Bài tập của Lớp */}
              {classActiveTab === "exams" && (
                <div className="space-y-6">
                  {/* Bộ lọc bài tập trong lớp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        Danh sách bài tập của lớp
                      </h3>
                      <span className="text-xs text-slate-500">
                        Thực hiện bài kiểm tra theo đúng thời hạn quy định
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { id: "all", label: `Tất cả (${activeClassExams.length})` },
                        {
                          id: "pending",
                          label: `Chưa nộp (${
                            activeClassExams.filter(
                              (e) => !attemptsMap[e.id]?.some((a) => a.status === "submitted")
                            ).length
                          })`,
                        },
                        {
                          id: "completed",
                          label: `Đã nộp (${
                            activeClassExams.filter((e) =>
                              attemptsMap[e.id]?.some((a) => a.status === "submitted")
                            ).length
                          })`,
                        },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setExamStatusFilter(tab.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            examStatusFilter === tab.id
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lưới bài tập */}
                  {(() => {
                    const filtered = getFilteredExams(activeClassExams);
                    if (filtered.length === 0) {
                      return (
                        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400 text-sm space-y-3">
                          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                          <p className="text-slate-600 font-bold">
                            {activeClassExams.length === 0
                              ? "Thầy cô bộ môn chưa giao bài tập nào cho lớp học này."
                              : "Không có bài tập nào phù hợp với bộ lọc đã chọn."}
                          </p>
                          <p className="text-xs text-slate-400">
                            Hãy thường xuyên quay lại kiểm tra để không bỏ lỡ bài tập mới!
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((exam) => {
                          const studentAtts = attemptsMap[exam.id] || [];
                          const latestSubmitted = studentAtts.find((a) => a.status === "submitted");
                          const hasSubmitted = Boolean(latestSubmitted);

                          return (
                            <div
                              key={exam.id}
                              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                      hasSubmitted
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                    }`}
                                  >
                                    {hasSubmitted ? "Đã nộp bài" : "Chưa hoàn thành"}
                                  </span>

                                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {exam.durationMin ? `${exam.durationMin} phút` : "Không giới hạn"}
                                  </span>
                                </div>

                                <h4 className="font-bold text-slate-900 text-base mb-2 leading-snug line-clamp-2">
                                  {exam.title}
                                </h4>

                                {exam.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                                    {exam.description}
                                  </p>
                                )}

                                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 mb-6">
                                  <span className="flex items-center gap-1">
                                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                    {exam.questionCount || 0} câu
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Award className="w-3.5 h-3.5 text-emerald-500" />
                                    {exam.totalPoints || 0} điểm
                                  </span>
                                </div>
                              </div>

                              {/* Bottom Action */}
                              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                {hasSubmitted ? (
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-bold text-slate-800">
                                      Điểm:{" "}
                                      <strong className="text-emerald-600 text-sm">
                                        {latestSubmitted?.score}
                                      </strong>{" "}
                                      / {latestSubmitted?.maxScore}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    Lượt: {studentAtts.length} / {exam.maxAttempts || 1}
                                  </span>
                                )}

                                <Link
                                  to={`/s/exams/${exam.id}`}
                                  prefetch="intent"
                                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition-colors ${
                                    hasSubmitted
                                      ? "bg-slate-800 hover:bg-slate-900"
                                      : "bg-indigo-600 hover:bg-indigo-700"
                                  }`}
                                >
                                  {hasSubmitted ? "Xem kết quả" : "Làm bài ngay"}{" "}
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Nội dung Tab 2: Danh sách bạn cùng lớp */}
              {classActiveTab === "classmates" && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        Danh sách học sinh trong lớp ({classmates.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Các bạn cùng học môn {activeClass.subject || activeClass.name} với bạn
                      </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Tìm bạn cùng lớp..."
                        value={classmateSearch}
                        onChange={(e) => setClassmateSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  {loadingClassmates ? (
                    <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      Đang tải danh sách học sinh...
                    </div>
                  ) : (
                    (() => {
                      const filteredList = classmates.filter(
                        (c) =>
                          !classmateSearch ||
                          c.studentName.toLowerCase().includes(classmateSearch.toLowerCase()) ||
                          (c.studentCode &&
                            c.studentCode.toLowerCase().includes(classmateSearch.toLowerCase()))
                      );

                      if (filteredList.length === 0) {
                        return (
                          <div className="p-8 text-center text-xs text-slate-400">
                            Không tìm thấy học sinh nào phù hợp.
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold">
                                <th className="py-3 px-4 w-12 text-center">STT</th>
                                <th className="py-3 px-4">Mã học sinh</th>
                                <th className="py-3 px-4">Họ và tên</th>
                                <th className="py-3 px-4 text-right">Ngày tham gia</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredList.map((stu, index) => {
                                const isMe = stu.studentId === userProfile?.uid;
                                return (
                                  <tr
                                    key={stu.studentId || index}
                                    className={`hover:bg-slate-50/80 transition-colors ${
                                      isMe ? "bg-indigo-50/50 font-bold" : ""
                                    }`}
                                  >
                                    <td className="py-3 px-4 text-center text-slate-400">
                                      {index + 1}
                                    </td>
                                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                                      {stu.studentCode || "-"}
                                    </td>
                                    <td className="py-3 px-4 text-slate-900 flex items-center gap-2">
                                      <span>{stu.studentName}</span>
                                      {isMe && (
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                                          Bạn
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-right text-slate-400 font-medium">
                                      {stu.joinedAt ? formatDate(stu.joinedAt) : "-"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ===================== VIEW 2: TỔNG QUAN TẤT CẢ LỚP HỌC & TẤT CẢ BÀI TẬP ===================== */
            <div className="space-y-6">
              {/* Tab chuyển đổi: Lớp học phần vs Tất cả bài tập */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-200/80 w-fit">
                  <button
                    type="button"
                    onClick={() => setMainTab("classes")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      mainTab === "classes"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FolderOpen className="w-4 h-4 text-indigo-600" />
                    Lớp học phần của tôi ({studentClasses.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setMainTab("exams")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      mainTab === "exams"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Tất cả bài tập & Đề thi ({exams.length})
                  </button>
                </div>

                {mainTab === "classes" && (
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm lớp học, giáo viên..."
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                )}
              </div>

              {/* ----------------- SUBVIEW: LỚP HỌC PHẦN CỦA TÔI ----------------- */}
              {mainTab === "classes" && (
                <div className="space-y-6">
                  {/* Bộ lọc theo môn học (nếu có nhiều môn học) */}
                  {distinctSubjects.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      <button
                        type="button"
                        onClick={() => setSubjectFilter("all")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          subjectFilter === "all"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        Tất cả môn ({studentClasses.length})
                      </button>
                      {distinctSubjects.map((sub) => {
                        const count = studentClasses.filter((c) => c.subject === sub).length;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setSubjectFilter(sub)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                              subjectFilter === sub
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {sub} ({count})
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Lưới các Lớp học */}
                  {filteredClasses.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400 text-sm space-y-4">
                      <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
                      <div className="max-w-md mx-auto">
                        <h4 className="font-bold text-slate-800 text-base mb-1">
                          {studentClasses.length === 0
                            ? "Bạn chưa tham gia lớp học phần nào"
                            : "Không tìm thấy lớp học phù hợp với từ khóa"}
                        </h4>
                        <p className="text-xs text-slate-500 mb-6">
                          {studentClasses.length === 0
                            ? "Hãy sử dụng mã mời (6 ký tự) do thầy cô bộ môn cung cấp để tham gia lớp và nhận bài tập."
                            : "Vui lòng thử tìm kiếm bằng từ khóa hoặc môn học khác."}
                        </p>
                        {studentClasses.length === 0 && (
                          <Link
                            to="/s/join"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition-all hover:scale-102"
                          >
                            <PlusCircle className="w-4 h-4" /> Tham gia lớp học phần ngay
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredClasses.map((cls) => {
                        const theme = getSubjectTheme(cls.subject, cls.name);
                        const clsExams = exams.filter(
                          (e) => e.classIds && e.classIds.includes(cls.id)
                        );
                        const pendingCount = clsExams.filter(
                          (e) => !attemptsMap[e.id]?.some((a) => a.status === "submitted")
                        ).length;

                        return (
                          <div
                            key={cls.id}
                            onClick={() => handleSelectClass(cls)}
                            className={`group bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between ${theme.borderHover}`}
                          >
                            <div>
                              {/* Header Card: Môn học & Khối */}
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${theme.badgeClass}`}
                                >
                                  <span>{theme.icon}</span>
                                  <span>{cls.subject || "Chung"}</span>
                                </span>

                                {cls.grade && (
                                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    {cls.grade}
                                  </span>
                                )}
                              </div>

                              {/* Tên lớp */}
                              <h3 className="font-black text-slate-900 text-lg mb-2 group-hover:text-indigo-600 transition-colors leading-snug">
                                {cls.name}
                              </h3>

                              {/* Giáo viên */}
                              <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-4 font-medium">
                                <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>Thầy/Cô: <strong>{cls.teacherName || "Chưa cập nhật"}</strong></span>
                              </p>

                              {cls.description && (
                                <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                                  {cls.description}
                                </p>
                              )}

                              {/* Thông số lớp */}
                              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mb-6 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                                <span className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-slate-400" />
                                  {cls.studentCount || 0} học sinh
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  {clsExams.length} bài tập
                                </span>
                              </div>
                            </div>

                            {/* Bottom Card Action */}
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                              {pendingCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" /> Có {pendingCount} bài chưa nộp
                                </span>
                              ) : clsExams.length > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" /> Đã hoàn thành tất cả
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">Chưa có bài tập</span>
                              )}

                              <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                                Vào lớp <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ----------------- SUBVIEW: TẤT CẢ BÀI TẬP & ĐỀ THI ----------------- */}
              {mainTab === "exams" && (
                <div className="space-y-6">
                  {/* Header & Bộ lọc */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        Tất cả bài tập từ các lớp
                      </h3>
                      <span className="text-xs text-slate-500">
                        Tìm thấy {getFilteredExams(exams).length} bài tập khả dụng
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { id: "all", label: `Tất cả (${exams.length})` },
                        {
                          id: "pending",
                          label: `Chưa nộp (${
                            exams.filter(
                              (e) => !attemptsMap[e.id]?.some((a) => a.status === "submitted")
                            ).length
                          })`,
                        },
                        {
                          id: "completed",
                          label: `Đã hoàn thành (${
                            exams.filter((e) =>
                              attemptsMap[e.id]?.some((a) => a.status === "submitted")
                            ).length
                          })`,
                        },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setExamStatusFilter(tab.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            examStatusFilter === tab.id
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lưới tất cả đề thi */}
                  {(() => {
                    const filtered = getFilteredExams(exams);
                    if (filtered.length === 0) {
                      return (
                        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400 text-sm space-y-3">
                          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                          <p>Hiện tại bạn không có bài tập nào cần làm.</p>
                          <Link
                            to="/s/join"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                          >
                            Nhập mã để vào thêm lớp học <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((exam) => {
                          const studentAtts = attemptsMap[exam.id] || [];
                          const latestSubmitted = studentAtts.find((a) => a.status === "submitted");
                          const hasSubmitted = Boolean(latestSubmitted);

                          // Tên lớp giao bài tập này
                          const assignedClassNames = (exam.classIds || [])
                            .map((cid) => classMap.get(cid))
                            .filter(Boolean);

                          return (
                            <div
                              key={exam.id}
                              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                      hasSubmitted
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                    }`}
                                  >
                                    {hasSubmitted ? "Đã nộp bài" : "Chưa hoàn thành"}
                                  </span>

                                  <span className="text-[11px] font-semibold text-slate-400">
                                    {exam.durationMin ? `${exam.durationMin} phút` : "Không giới hạn"}
                                  </span>
                                </div>

                                <h3 className="font-bold text-slate-900 text-base mb-2 leading-snug">
                                  {exam.title}
                                </h3>

                                {/* Tag lớp học giao bài */}
                                {assignedClassNames.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                    {assignedClassNames.map((name, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold"
                                      >
                                        Lớp: {name}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {exam.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                                    {exam.description}
                                  </p>
                                )}

                                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 mb-6">
                                  <span className="flex items-center gap-1">
                                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                    {exam.questionCount || 0} câu
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Award className="w-3.5 h-3.5 text-emerald-500" />
                                    {exam.totalPoints || 0} điểm
                                  </span>
                                </div>
                              </div>

                              {/* Bottom Action */}
                              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                {hasSubmitted ? (
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-bold text-slate-800">
                                      Điểm:{" "}
                                      <strong className="text-emerald-600 text-sm">
                                        {latestSubmitted?.score}
                                      </strong>{" "}
                                      / {latestSubmitted?.maxScore}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    Lượt làm: {studentAtts.length} / {exam.maxAttempts || 1}
                                  </span>
                                )}

                                <Link
                                  to={`/s/exams/${exam.id}`}
                                  prefetch="intent"
                                  className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition-colors ${
                                    hasSubmitted
                                      ? "bg-slate-800 hover:bg-slate-900"
                                      : "bg-indigo-600 hover:bg-indigo-700"
                                  }`}
                                >
                                  {hasSubmitted ? "Xem kết quả" : "Làm bài ngay"}{" "}
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
