import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { getExams, getClasses, deleteExam, getClassExamProgress } from "../../lib/db";
import type { Exam, ClassRoom, ClassStudentSubmission } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import {
  FileText,
  Plus,
  Clock,
  Layers,
  Award,
  Settings,
  HelpCircle,
  BarChart3,
  Paperclip,
  Trash2,
  Users,
  School,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  ExternalLink,
} from "lucide-react";

export default function TeacherExamsPage() {
  const { userProfile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Quick Class Progress Modal State
  const [progressModalExam, setProgressModalExam] = useState<Exam | null>(null);
  const [modalClassId, setModalClassId] = useState<string>("");
  const [modalProgress, setModalProgress] = useState<{
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
  } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (userProfile?.uid) {
      loadData();
    }
  }, [userProfile?.uid]);

  async function loadData() {
    if (!userProfile?.uid) return;
    setLoading(true);
    try {
      const [eList, cList] = await Promise.all([
        getExams({ ownerId: userProfile.uid }),
        getClasses(userProfile.uid),
      ]);
      setExams(eList);
      setClasses(cList);
    } catch (err) {
      console.error("Lỗi tải đề thi:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteExam = async (examId: string, title: string) => {
    if (
      !confirm(
        `Bạn có chắc muốn xóa đề thi "${title}"? Toàn bộ câu hỏi và kết quả sẽ bị xóa vĩnh viễn.`
      )
    ) {
      return;
    }

    try {
      await deleteExam(examId);
      await loadData();
    } catch (err: any) {
      alert("Lỗi xóa đề thi: " + err.message);
    }
  };

  const handleOpenClassProgress = async (exam: Exam, targetClassId?: string) => {
    setProgressModalExam(exam);
    const chosenClassId =
      targetClassId || (exam.classIds && exam.classIds.length > 0 ? exam.classIds[0] : "");
    setModalClassId(chosenClassId);

    if (chosenClassId) {
      await loadClassModalProgress(exam.id, chosenClassId);
    } else {
      setModalProgress(null);
    }
  };

  const handleChangeModalClass = async (newClassId: string) => {
    if (!progressModalExam) return;
    setModalClassId(newClassId);
    await loadClassModalProgress(progressModalExam.id, newClassId);
  };

  const loadClassModalProgress = async (examId: string, cId: string) => {
    setModalLoading(true);
    try {
      const prog = await getClassExamProgress(examId, cId);
      setModalProgress(prog);
    } catch (err) {
      console.error("Lỗi lấy tiến độ lớp:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const classMap = new Map(classes.map((c) => [c.id, c.name]));

  const filtered = exams.filter((e) => {
    if (filter === "all") return true;
    return e.status === filter;
  });

  return (
    <ProtectedRoute allowedRole="teacher">
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <FileText className="w-7 h-7 text-indigo-600" />
                Danh sách Đề trắc nghiệm
              </h1>
              <p className="text-slate-500 text-xs mt-1">
                Quản lý đề thi, theo dõi danh sách học sinh làm bài theo từng lớp đã giao, và quản lý bảng điểm
              </p>
            </div>

            <Link
              to="/t/exams/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all self-start sm:self-auto hover:scale-102"
            >
              <Plus className="w-4 h-4" /> Tạo đề kiểm tra mới
            </Link>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: "all", label: "Tất cả đề" },
              { id: "published", label: "Đang mở thi" },
              { id: "draft", label: "Bản nháp" },
              { id: "closed", label: "Đã đóng" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 mt-3 font-medium">Đang tải danh sách đề thi từ hệ thống...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Chưa có đề thi nào</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Hãy bắt đầu tạo đề kiểm tra trắc nghiệm đầu tiên cho lớp học của bạn.
                </p>
              </div>
              <Link
                to="/t/exams/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-200"
              >
                <Plus className="w-4 h-4" /> Tạo đề thi ngay
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          exam.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : exam.status === "draft"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {exam.status === "published"
                          ? "Đang mở"
                          : exam.status === "draft"
                          ? "Bản nháp"
                          : "Đã đóng"}
                      </span>

                      {/* Hiển thị các lớp đã giao (click vào để xem nhanh danh sách làm bài của lớp đó) */}
                      {exam.classIds && exam.classIds.length > 0 ? (
                        exam.classIds.map((cid) => (
                          <button
                            key={cid}
                            type="button"
                            onClick={() => handleOpenClassProgress(exam, cid)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-100 transition-colors"
                            title={`Xem danh sách học sinh làm bài của ${classMap.get(cid) || "Lớp"}`}
                          >
                            <School className="w-3 h-3 text-indigo-500" />
                            {classMap.get(cid) || "Lớp học phần"}
                          </button>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-xs">
                          Chưa gán lớp
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900 text-lg leading-snug">
                        {exam.title}
                      </h3>
                      {exam.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {exam.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        {exam.questionCount || 0} câu hỏi
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-500" />
                        Tổng {exam.totalPoints || 0} điểm
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-500" />
                        {exam.durationMin ? `${exam.durationMin} phút` : "Không giới hạn"}
                      </span>
                      {exam.files && exam.files.length > 0 && (
                        <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                          <Paperclip className="w-4 h-4" />
                          {exam.files.length} file đính kèm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nhóm nút hành động */}
                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 w-full lg:w-auto">
                    {/* Nút Xem học sinh làm bài theo lớp */}
                    {exam.classIds && exam.classIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenClassProgress(exam)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-xs transition-colors"
                        title="Xem danh sách học sinh đã làm/chưa làm theo từng lớp"
                      >
                        <Users className="w-4 h-4 text-violet-600" /> Xem theo lớp ({exam.classIds.length})
                      </button>
                    )}

                    <Link
                      to={`/t/exams/${exam.id}/questions`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" /> Câu hỏi ({exam.questionCount || 0})
                    </Link>

                    <Link
                      to={`/t/exams/${exam.id}/files`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors"
                    >
                      <Paperclip className="w-4 h-4" /> File đề
                    </Link>

                    <Link
                      to={`/t/exams/${exam.id}/results`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                    >
                      <BarChart3 className="w-4 h-4" /> Bảng điểm
                    </Link>

                    <Link
                      to={`/t/exams/${exam.id}`}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                      title="Cài đặt đề"
                    >
                      <Settings className="w-4 h-4" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteExam(exam.id, exam.title)}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Xóa đề thi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ================= MODAL XEM HỌC SINH LÀM BÀI THEO TỪNG LỚP ================= */}
          {progressModalExam && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                        Tiến độ làm bài theo lớp
                      </span>
                    </div>
                    <h3 className="font-black text-slate-900 text-lg leading-tight">
                      {progressModalExam.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setProgressModalExam(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Class Tabs Selector inside Modal */}
                {progressModalExam.classIds && progressModalExam.classIds.length > 0 && (
                  <div className="px-6 pt-4 border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0 bg-slate-50/50">
                    {progressModalExam.classIds.map((cId) => (
                      <button
                        key={cId}
                        type="button"
                        onClick={() => handleChangeModalClass(cId)}
                        className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                          modalClassId === cId
                            ? "border-indigo-600 text-indigo-700 bg-white"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <School className="w-3.5 h-3.5" />
                        {classMap.get(cId) || "Lớp học phần"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                  {modalLoading ? (
                    <div className="flex flex-col items-center justify-center p-12">
                      <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-slate-400 mt-2 font-medium">Đang tải tiến độ học sinh...</p>
                    </div>
                  ) : !modalClassId ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Đề thi này chưa được gán cho lớp học phần nào.
                    </div>
                  ) : modalProgress ? (
                    <>
                      {/* Stat Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Sĩ số lớp
                          </span>
                          <span className="text-xl font-black text-slate-900">
                            {modalProgress.stats.total} HS
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                            Đã nộp bài
                          </span>
                          <span className="text-xl font-black text-emerald-700">
                            {modalProgress.stats.submitted} HS
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100">
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                            Chưa làm bài
                          </span>
                          <span className="text-xl font-black text-rose-700">
                            {modalProgress.stats.notStarted} HS
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                            Điểm TB lớp
                          </span>
                          <span className="text-xl font-black text-indigo-700">
                            {modalProgress.stats.avgScore} / {progressModalExam.totalPoints || 10}
                          </span>
                        </div>
                      </div>

                      {/* Tiến độ hoàn thành */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span>Tỷ lệ nộp bài của lớp</span>
                          <span className="font-bold text-slate-900">
                            {modalProgress.stats.total > 0
                              ? Math.round((modalProgress.stats.submitted / modalProgress.stats.total) * 100)
                              : 0}
                            % ({modalProgress.stats.submitted}/{modalProgress.stats.total})
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{
                              width: `${
                                modalProgress.stats.total > 0
                                  ? (modalProgress.stats.submitted / modalProgress.stats.total) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Danh sách học sinh của lớp */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-600 flex items-center justify-between">
                          <span>Danh sách học sinh ({modalProgress.students.length})</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            Bao gồm học sinh đã nộp và chưa làm bài
                          </span>
                        </div>

                        {modalProgress.students.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            Lớp này hiện chưa có học sinh nào.
                          </div>
                        ) : (
                          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
                            {modalProgress.students.map((item, i) => {
                              const isSubmitted = item.status === "submitted";
                              const isNotStarted = item.status === "not_started";

                              return (
                                <div
                                  key={item.student.studentId}
                                  className={`p-3 flex items-center justify-between gap-3 ${
                                    isNotStarted ? "bg-rose-50/15" : "hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-slate-400 w-5 text-right font-medium">{i + 1}.</span>
                                    <div>
                                      <span className="font-bold text-slate-900 block">
                                        {item.student.studentName}
                                      </span>
                                      <span className="text-[11px] text-slate-400">
                                        {item.student.studentCode || item.student.studentEmail || "Học sinh"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {isSubmitted ? (
                                      <div className="text-right">
                                        <span className="font-black text-indigo-600 text-xs block">
                                          {item.score} / {item.maxScore || progressModalExam.totalPoints || 10}đ
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          {item.submittedAt ? formatDate(item.submittedAt) : "Đã nộp"}
                                        </span>
                                      </div>
                                    ) : item.status === "in_progress" ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Đang làm bài
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                        Chưa làm bài
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
                  <span className="text-xs text-slate-500">
                    Lớp: <strong>{classMap.get(modalClassId) || "—"}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProgressModalExam(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60"
                    >
                      Đóng
                    </button>
                    {modalClassId && (
                      <Link
                        to={`/t/exams/${progressModalExam.id}/results?classId=${modalClassId}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
                      >
                        Xem bảng điểm chi tiết <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
