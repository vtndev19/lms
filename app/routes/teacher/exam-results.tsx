import React, { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  getExamById,
  getAttemptsByExamId,
  getQuestionsByExamId,
  getClasses,
  getClassExamProgress,
} from "../../lib/db";
import {
  exportResultsToExcel,
  exportClassExamResultsToExcel,
} from "../../lib/exportExcel";
import type {
  Exam,
  Attempt,
  Question,
  ClassRoom,
  ClassStudentSubmission,
} from "../../lib/types";
import { formatDate } from "../../lib/utils";
import {
  ArrowLeft,
  Download,
  BarChart3,
  Users,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  School,
  Search,
  Filter,
  Check,
  Layers,
  ArrowRight,
  Mail,
} from "lucide-react";

export default function TeacherExamResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedClassParam = searchParams.get("classId") || "all";

  const [exam, setExam] = useState<Exam | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);

  // Active tab: "all" or specific classId
  const [selectedClassId, setSelectedClassId] = useState<string>(selectedClassParam);

  // Per-class progress state
  const [classProgressMap, setClassProgressMap] = useState<
    Record<
      string,
      {
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
      }
    >
  >({});
  const [loadingClassProgress, setLoadingClassProgress] = useState(false);

  // Filter inside class student roster
  const [studentStatusFilter, setStudentStatusFilter] = useState<
    "all" | "submitted" | "in_progress" | "not_started"
  >("all");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  useEffect(() => {
    setSelectedClassId(selectedClassParam);
  }, [selectedClassParam]);

  async function loadData(examId: string) {
    setLoading(true);
    try {
      const [eDoc, aList, qList, allClasses] = await Promise.all([
        getExamById(examId),
        getAttemptsByExamId(examId),
        getQuestionsByExamId(examId),
        getClasses(),
      ]);
      setExam(eDoc);
      setAttempts(aList);
      setQuestions(qList);

      // Filter classes assigned to this exam
      const cList = allClasses.filter((c) => eDoc?.classIds?.includes(c.id));
      setAssignedClasses(cList);

      // Pre-load progress for all assigned classes
      if (cList.length > 0) {
        setLoadingClassProgress(true);
        const map: Record<string, any> = {};
        await Promise.all(
          cList.map(async (cls) => {
            const prog = await getClassExamProgress(examId, cls.id);
            map[cls.id] = prog;
          })
        );
        setClassProgressMap(map);
        setLoadingClassProgress(false);
      }
    } finally {
      setLoading(false);
    }
  }

  // Switch class tab
  const handleSelectClass = (cId: string) => {
    setSelectedClassId(cId);
    setStudentStatusFilter("all");
    setStudentSearchTerm("");
    if (cId === "all") {
      searchParams.delete("classId");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ classId: cId });
    }
  };

  // Overall Statistics for "all" tab
  const submittedAttempts = attempts.filter((a) => a.status === "submitted");
  const totalSubmissions = submittedAttempts.length;

  const avgScore =
    totalSubmissions > 0
      ? (
          submittedAttempts.reduce((acc, a) => acc + (a.score || 0), 0) /
          totalSubmissions
        ).toFixed(2)
      : "0";

  const maxScoreAchieved =
    totalSubmissions > 0
      ? Math.max(...submittedAttempts.map((a) => a.score || 0))
      : 0;

  // Question stats
  const questionStats = questions.map((q) => {
    let correctCount = 0;
    let answeredCount = 0;

    submittedAttempts.forEach((a) => {
      if (a.detail && a.detail[q.id]) {
        answeredCount++;
        if (a.detail[q.id].earned === q.points) {
          correctCount++;
        }
      }
    });

    const percent =
      answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

    return {
      question: q,
      correctCount,
      answeredCount,
      percent,
    };
  });

  // Active class data when a class tab is selected
  const activeClass = assignedClasses.find((c) => c.id === selectedClassId);
  const activeClassProgress = activeClass ? classProgressMap[activeClass.id] : null;

  // Filter students within the active class
  const filteredClassStudents = useMemo(() => {
    if (!activeClassProgress) return [];
    let list = activeClassProgress.students;

    if (studentStatusFilter !== "all") {
      list = list.filter((s) => s.status === studentStatusFilter);
    }

    const q = studentSearchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          (s.student.studentName && s.student.studentName.toLowerCase().includes(q)) ||
          (s.student.studentEmail && s.student.studentEmail.toLowerCase().includes(q)) ||
          (s.student.studentCode && s.student.studentCode.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activeClassProgress, studentStatusFilter, studentSearchTerm]);

  // Export handlers
  const handleExportAll = async () => {
    if (!exam) return;
    await exportResultsToExcel(exam.title, attempts);
  };

  const handleExportActiveClass = async () => {
    if (!exam || !activeClass || !activeClassProgress) return;
    await exportClassExamResultsToExcel(
      exam.title,
      activeClass.name,
      filteredClassStudents
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRole="teacher">
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/t/exams"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách đề
          </Link>

          {/* Page Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                  Bảng điểm & Thống kê
                </span>
                <span className="text-xs text-slate-400">
                  {assignedClasses.length} lớp được giao
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <BarChart3 className="w-7 h-7 text-indigo-600" />
                {exam?.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Theo dõi tiến độ và kết quả làm bài của từng lớp đã giao, thống kê câu hỏi và xuất báo cáo Excel
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {selectedClassId === "all" ? (
                <button
                  type="button"
                  onClick={handleExportAll}
                  disabled={attempts.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4" /> Xuất toàn bộ bảng điểm (.xlsx)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleExportActiveClass}
                  disabled={!activeClassProgress || activeClassProgress.students.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4" /> Xuất bảng điểm {activeClass?.name} (.xlsx)
                </button>
              )}
            </div>
          </div>

          {/* ================= CLASS SELECTOR TABS ================= */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => handleSelectClass("all")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedClassId === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Tổng quan tất cả các lớp ({totalSubmissions} bài nộp)
            </button>

            {assignedClasses.map((cls) => {
              const prog = classProgressMap[cls.id];
              const submitted = prog?.stats.submitted || 0;
              const total = prog?.stats.total || cls.studentCount || 0;

              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => handleSelectClass(cls.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                    selectedClassId === cls.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <School className="w-4 h-4" />
                  <span>{cls.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      selectedClassId === cls.id
                        ? "bg-white/20 text-white"
                        : "bg-indigo-50 text-indigo-700"
                    }`}
                  >
                    {submitted}/{total} đã làm
                  </span>
                </button>
              );
            })}
          </div>

          {/* ================= VIEW A: KHI CHỌN MỘT LỚP CỤ THỂ ================= */}
          {selectedClassId !== "all" && activeClass && (
            <div className="space-y-6">
              {/* Thống kê tiến độ của riêng lớp này */}
              {loadingClassProgress ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200">
                  <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 mt-2">Đang tải danh sách học sinh của lớp {activeClass.name}...</p>
                </div>
              ) : activeClassProgress ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Sĩ số lớp */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Sĩ số lớp
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-slate-900">
                            {activeClassProgress.stats.total}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">học sinh</span>
                        </div>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Đã nộp bài */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Đã nộp bài
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-emerald-600">
                            {activeClassProgress.stats.submitted}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">
                            / {activeClassProgress.stats.total} (
                            {activeClassProgress.stats.total > 0
                              ? Math.round(
                                  (activeClassProgress.stats.submitted /
                                    activeClassProgress.stats.total) *
                                    100
                                )
                              : 0}
                            %)
                          </span>
                        </div>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Chưa làm bài */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Chưa làm bài
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-rose-600">
                            {activeClassProgress.stats.notStarted}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">học sinh</span>
                        </div>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Điểm trung bình lớp */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Điểm trung bình lớp
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-indigo-600">
                            {activeClassProgress.stats.avgScore}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">
                            / {exam?.totalPoints || 10}
                          </span>
                        </div>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Thanh tiến độ hoàn thành bài thi của lớp */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-slate-700">Tiến độ nộp bài của lớp {activeClass.name}</span>
                      <span className="text-indigo-600">
                        {activeClassProgress.stats.submitted} / {activeClassProgress.stats.total} học sinh đã hoàn thành
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{
                          width: `${
                            activeClassProgress.stats.total > 0
                              ? (activeClassProgress.stats.submitted / activeClassProgress.stats.total) * 100
                              : 0
                          }%`,
                        }}
                        title={`Đã nộp: ${activeClassProgress.stats.submitted}`}
                      />
                      <div
                        className="bg-amber-400 h-full transition-all"
                        style={{
                          width: `${
                            activeClassProgress.stats.total > 0
                              ? (activeClassProgress.stats.inProgress / activeClassProgress.stats.total) * 100
                              : 0
                          }%`,
                        }}
                        title={`Đang làm: ${activeClassProgress.stats.inProgress}`}
                      />
                    </div>
                    <div className="flex items-center gap-5 text-[11px] text-slate-500 mt-2 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        Đã nộp: {activeClassProgress.stats.submitted}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                        Đang làm: {activeClassProgress.stats.inProgress}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" />
                        Chưa làm: {activeClassProgress.stats.notStarted}
                      </span>
                    </div>
                  </div>

                  {/* Thanh lọc & tìm kiếm học sinh của lớp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {[
                        { id: "all", label: "Tất cả học sinh", count: activeClassProgress.stats.total },
                        { id: "submitted", label: "Đã nộp bài", count: activeClassProgress.stats.submitted },
                        { id: "in_progress", label: "Đang làm", count: activeClassProgress.stats.inProgress },
                        { id: "not_started", label: "Chưa làm bài", count: activeClassProgress.stats.notStarted },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setStudentStatusFilter(tab.id as any)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                            studentStatusFilter === tab.id
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                              studentStatusFilter === tab.id
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        placeholder="Tìm học sinh theo tên, mã..."
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* BẢNG CHI TIẾT HỌC SINH CỦA LỚP */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">
                          Danh sách học sinh lớp {activeClass.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Hiển thị {filteredClassStudents.length} / {activeClassProgress.stats.total} học sinh
                        </p>
                      </div>
                    </div>

                    {filteredClassStudents.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-sm">
                        Không có học sinh nào trong bộ lọc này.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                            <tr>
                              <th className="py-3.5 px-6 w-14">STT</th>
                              <th className="py-3.5 px-6">Học sinh</th>
                              <th className="py-3.5 px-4">Mã HS / Email</th>
                              <th className="py-3.5 px-4">Trạng thái bài</th>
                              <th className="py-3.5 px-4">Điểm số</th>
                              <th className="py-3.5 px-4">Lần làm</th>
                              <th className="py-3.5 px-4">Thời gian nộp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredClassStudents.map((item, idx) => {
                              const isSubmitted = item.status === "submitted";
                              const isInProgress = item.status === "in_progress";
                              const isNotStarted = item.status === "not_started";

                              return (
                                <tr
                                  key={item.student.studentId}
                                  className={`transition-colors hover:bg-slate-50/70 ${
                                    isNotStarted ? "bg-rose-50/20" : ""
                                  }`}
                                >
                                  <td className="py-4 px-6 text-slate-400 font-semibold">{idx + 1}</td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                          isSubmitted
                                            ? "bg-emerald-100 text-emerald-700"
                                            : isInProgress
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-slate-100 text-slate-500"
                                        }`}
                                      >
                                        {item.student.studentName.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="font-bold text-slate-900 text-sm">
                                        {item.student.studentName}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="py-4 px-4">
                                    <div className="space-y-0.5">
                                      {item.student.studentCode && (
                                        <span className="font-mono text-xs font-bold text-slate-700 block">
                                          {item.student.studentCode}
                                        </span>
                                      )}
                                      <span className="text-slate-400 text-[11px] block">
                                        {item.student.studentEmail || "—"}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="py-4 px-4">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                        isSubmitted
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : isInProgress
                                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                                          : "bg-rose-50 text-rose-700 border border-rose-200"
                                      }`}
                                    >
                                      {isSubmitted ? (
                                        <>
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã nộp bài
                                        </>
                                      ) : isInProgress ? (
                                        <>
                                          <Clock className="w-3.5 h-3.5" /> Đang làm bài
                                        </>
                                      ) : (
                                        <>
                                          <AlertCircle className="w-3.5 h-3.5" /> Chưa làm bài
                                        </>
                                      )}
                                    </span>
                                  </td>

                                  <td className="py-4 px-4">
                                    {isSubmitted && item.score !== null && item.score !== undefined ? (
                                      <div>
                                        <span className="font-black text-sm text-indigo-600">
                                          {item.score}
                                        </span>
                                        <span className="text-slate-400 text-[11px]">
                                          {" "}
                                          / {item.maxScore || exam?.totalPoints || 10}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </td>

                                  <td className="py-4 px-4 text-slate-500">
                                    {isSubmitted
                                      ? `Lần ${item.attempt?.attemptNo || 1}`
                                      : isInProgress
                                      ? "Đang thi"
                                      : "—"}
                                  </td>

                                  <td className="py-4 px-4 text-slate-500">
                                    {item.submittedAt ? formatDate(item.submittedAt) : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ================= VIEW B: TỔNG QUAN TẤT CẢ CÁC LỚP ================= */}
          {selectedClassId === "all" && (
            <div className="space-y-8">
              {/* Cards Tổng quan chung */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Tổng bài đã nộp
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-slate-900">{totalSubmissions}</span>
                    <Users className="w-5 h-5 text-indigo-500" />
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Điểm trung bình chung
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-slate-900">{avgScore}</span>
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Điểm cao nhất
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-emerald-600">
                      {maxScoreAchieved} / {exam?.totalPoints || 10}
                    </span>
                    <Award className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Tổng số câu hỏi
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-slate-900">{questions.length}</span>
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
              </div>

              {/* Tóm tắt từng lớp đã giao (Quick Class Breakdown) */}
              {assignedClasses.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-base mb-1">
                    Tiến độ làm bài theo từng lớp được giao
                  </h3>
                  <p className="text-xs text-slate-500 mb-5">
                    Bấm vào từng lớp để xem danh sách học sinh đã làm hoặc chưa làm bài
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedClasses.map((cls) => {
                      const prog = classProgressMap[cls.id];
                      const submitted = prog?.stats.submitted || 0;
                      const total = prog?.stats.total || cls.studentCount || 0;
                      const percent = total > 0 ? Math.round((submitted / total) * 100) : 0;
                      const clsAvg = prog?.stats.avgScore || "0";

                      return (
                        <div
                          key={cls.id}
                          className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-black text-slate-900 text-base">{cls.name}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-700 border border-slate-200">
                                {percent}% nộp bài
                              </span>
                            </div>

                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${percent}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                              <span>
                                Đã nộp: <strong>{submitted}</strong> / {total} HS
                              </span>
                              <span>
                                Điểm TB: <strong className="text-indigo-600">{clsAvg}</strong>
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectClass(cls.id)}
                            className="w-full py-2 rounded-xl bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors flex items-center justify-center gap-1.5"
                          >
                            Xem danh sách học sinh <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Thống kê tỷ lệ làm đúng theo từng câu hỏi */}
              {questionStats.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-base mb-1">
                    Phân tích tỷ lệ làm đúng theo câu hỏi
                  </h3>
                  <p className="text-xs text-slate-500 mb-6">
                    Giúp phát hiện những câu hỏi học sinh làm sai nhiều để giảng lại hoặc kiểm tra tính chính xác của đề
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {questionStats.map((st, i) => (
                      <div
                        key={st.question.id}
                        className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">
                            Câu {i + 1} ({st.question.points}đ)
                          </span>
                          <span
                            className={`font-black ${
                              st.percent >= 70
                                ? "text-emerald-600"
                                : st.percent >= 40
                                ? "text-amber-600"
                                : "text-rose-600"
                            }`}
                          >
                            {st.percent}% đúng ({st.correctCount}/{st.answeredCount})
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all rounded-full ${
                              st.percent >= 70
                                ? "bg-emerald-500"
                                : st.percent >= 40
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${st.percent}%` }}
                          />
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                          {st.question.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bảng điểm chi tiết toàn bộ các lượt làm bài */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Toàn bộ lượt thi đã nộp</h3>
                    <span className="text-xs text-slate-400">
                      Tổng cộng {attempts.length} lượt thi đã ghi nhận
                    </span>
                  </div>
                </div>

                {attempts.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    Chưa có học sinh nào làm bài thi này.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="py-3.5 px-6">Học sinh</th>
                          <th className="py-3.5 px-4">Lớp</th>
                          <th className="py-3.5 px-4">Lần làm</th>
                          <th className="py-3.5 px-4">Điểm số</th>
                          <th className="py-3.5 px-4">Thời lượng</th>
                          <th className="py-3.5 px-4">Thời điểm nộp</th>
                          <th className="py-3.5 px-6">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {attempts.map((att) => {
                          let durationStr = "—";
                          if (att.startedAt && att.submittedAt) {
                            const start = new Date(att.startedAt).getTime();
                            const end = new Date(att.submittedAt).getTime();
                            const mins = Math.round((end - start) / 60000);
                            durationStr = `${mins} phút`;
                          }

                          const matchedClassName =
                            assignedClasses.find((c) => c.id === att.classId)?.name ||
                            att.classId ||
                            "—";

                          return (
                            <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-4 px-6 font-bold text-slate-900">
                                {att.studentName || "Học sinh"}
                              </td>
                              <td className="py-4 px-4 font-semibold text-slate-600">
                                {matchedClassName}
                              </td>
                              <td className="py-4 px-4 font-semibold text-slate-500">
                                Lần {att.attemptNo || 1}
                              </td>
                              <td className="py-4 px-4">
                                <span className="font-black text-sm text-indigo-600">
                                  {att.score !== null ? att.score : "—"}
                                </span>
                                <span className="text-slate-400 text-[11px]">
                                  {" "}
                                  / {att.maxScore || 10}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-slate-500">{durationStr}</td>
                              <td className="py-4 px-4 text-slate-500">
                                {formatDate(att.submittedAt)}
                              </td>
                              <td className="py-4 px-6">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                    att.status === "submitted"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : att.status === "expired"
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}
                                >
                                  {att.status === "submitted"
                                    ? "Đã nộp"
                                    : att.status === "expired"
                                    ? "Hết giờ"
                                    : "Đang làm"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
