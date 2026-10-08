import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  getExamById,
  getAttemptsByExamId,
  getQuestionsByExamId,
} from "../../lib/db";
import type { Exam, Attempt, Question } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import { exportResultsToExcel } from "../../lib/exportExcel";
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
} from "lucide-react";

export default function TeacherExamResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  async function loadData(examId: string) {
    setLoading(true);
    try {
      const [eDoc, aList, qList] = await Promise.all([
        getExamById(examId),
        getAttemptsByExamId(examId),
        getQuestionsByExamId(examId),
      ]);
      setExam(eDoc);
      setAttempts(aList);
      setQuestions(qList);
    } finally {
      setLoading(false);
    }
  }

  // Thống kê
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

  // Thống kê theo từng câu hỏi
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

  const handleExport = () => {
    if (!exam) return;
    exportResultsToExcel(exam.title, attempts);
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <BarChart3 className="w-7 h-7 text-indigo-600" />
                Kết quả & Thống kê: {exam?.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Theo dõi bảng điểm học sinh, tỷ lệ đúng theo từng câu hỏi và xuất báo cáo Excel
              </p>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={attempts.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition-all disabled:opacity-50 self-start sm:self-auto"
            >
              <Download className="w-4 h-4" /> Xuất bảng điểm Excel (.xlsx)
            </button>
          </div>

          {/* Cards Tổng quan */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-8">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Số bài đã nộp
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-900">{totalSubmissions}</span>
                <Users className="w-5 h-5 text-indigo-500" />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Điểm trung bình
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

          {/* Thống kê tỷ lệ làm đúng theo từng câu hỏi */}
          {questionStats.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs mb-8">
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

          {/* Bảng điểm chi tiết */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Bảng điểm học sinh</h3>
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

                      return (
                        <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-900">
                            {att.studentName || "Học sinh"}
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
        </main>
      </div>
    </ProtectedRoute>
  );
}
