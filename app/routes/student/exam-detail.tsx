import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { FileList } from "../../components/FileList";
import { getExamById, getAttemptsByExamId, saveAttempt } from "../../lib/db";
import type { Exam, Attempt } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import {
  ArrowLeft,
  Clock,
  Layers,
  Award,
  Play,
  CheckCircle2,
  AlertTriangle,
  History,
  Paperclip,
} from "lucide-react";

export default function StudentExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [exam, setExam] = useState<Exam | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (id) loadData(id);
  }, [id, userProfile?.uid]);

  async function loadData(examId: string) {
    setLoading(true);
    try {
      const [eDoc, aList] = await Promise.all([
        getExamById(examId),
        getAttemptsByExamId(examId),
      ]);
      setExam(eDoc);
      const studentAtts = aList.filter(
        (a) => a.studentId === (userProfile?.uid || "demo-student-uid")
      );
      setAttempts(studentAtts);
    } finally {
      setLoading(false);
    }
  }

  const handleStartExam = async () => {
    if (!exam || !id) return;
    setStarting(true);

    try {
      // 1. Kiểm tra xem có bài in_progress nào chưa hết hạn không
      const active = attempts.find((a) => a.status === "in_progress");
      if (active) {
        navigate(`/s/attempts/${active.id}`);
        return;
      }

      // 2. Kiểm tra số lần làm bài
      const maxAttempts = exam.maxAttempts || 1;
      const completedCount = attempts.filter((a) => a.status === "submitted").length;
      if (completedCount >= maxAttempts) {
        alert(`Bạn đã dùng hết số lượt làm bài (${maxAttempts} lượt) cho đề thi này!`);
        return;
      }

      // 3. Tính toán deadline
      const now = new Date();
      let deadline: Date | null = null;
      if (exam.durationMin && exam.durationMin > 0) {
        deadline = new Date(now.getTime() + exam.durationMin * 60 * 1000);
      }

      const attemptId = `att-${Date.now()}`;
      const newAttempt: Attempt = {
        id: attemptId,
        examId: id,
        studentId: userProfile?.uid || "demo-student-uid",
        studentName: userProfile?.name || "Học sinh",
        classId: exam.classIds[0] || "",
        attemptNo: completedCount + 1,
        status: "in_progress",
        startedAt: now.toISOString(),
        deadline: deadline ? deadline.toISOString() : null,
        seed: Math.floor(Math.random() * 1000000),
        answers: {},
        submittedAt: null,
        score: null,
        maxScore: exam.totalPoints || 10,
        detail: null,
      };

      await saveAttempt(newAttempt);
      navigate(`/s/attempts/${attemptId}`);
    } catch (err: any) {
      alert("Lỗi bắt đầu làm bài: " + err.message);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-500 mb-4">Không tìm thấy đề thi này.</p>
        <Link to="/s" className="text-indigo-600 font-bold text-sm">
          Quay lại danh sách bài tập
        </Link>
      </div>
    );
  }

  const completedAttempts = attempts.filter((a) => a.status === "submitted");
  const maxAttempts = exam.maxAttempts || 1;
  const canTakeExam = completedAttempts.length < maxAttempts;
  const hasActiveAttempt = attempts.some((a) => a.status === "in_progress");

  return (
    <ProtectedRoute allowedRole="student">
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/s"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách bài tập
          </Link>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Header thông tin đề */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Đang mở
                </span>
                <span className="text-xs text-slate-400">
                  Cập nhật: {formatDate(exam.updatedAt || exam.createdAt)}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {exam.title}
              </h1>
            </div>

            {exam.description && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <strong className="block text-slate-900 font-bold mb-1">Hướng dẫn làm bài:</strong>
                {exam.description}
              </div>
            )}

            {/* Các thông số kỹ thuật */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-900/60 uppercase block mb-0.5">
                  Thời lượng làm
                </span>
                <span className="font-black text-sm text-indigo-950 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  {exam.durationMin ? `${exam.durationMin} phút` : "Không giới hạn"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-indigo-900/60 uppercase block mb-0.5">
                  Số lượng câu hỏi
                </span>
                <span className="font-black text-sm text-indigo-950 flex items-center gap-1">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  {exam.questionCount || 0} câu
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-indigo-900/60 uppercase block mb-0.5">
                  Tổng điểm tối đa
                </span>
                <span className="font-black text-sm text-indigo-950 flex items-center gap-1">
                  <Award className="w-4 h-4 text-emerald-600" />
                  {exam.totalPoints || 0} điểm
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-indigo-900/60 uppercase block mb-0.5">
                  Lượt làm tối đa
                </span>
                <span className="font-black text-sm text-indigo-950">
                  {completedAttempts.length} / {maxAttempts} lượt
                </span>
              </div>
            </div>

            {/* Tài liệu đính kèm (nếu có) */}
            {exam.files && exam.files.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-indigo-600" />
                  Tài liệu đề đính kèm ({exam.files.length})
                </h3>
                <FileList files={exam.files} />
              </div>
            )}

            {/* Nút Bắt đầu làm bài */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                {hasActiveAttempt ? (
                  <span className="text-amber-600 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Bạn đang có một bài thi chưa nộp, hãy tiếp tục!
                  </span>
                ) : canTakeExam ? (
                  <span>Bạn còn <strong>{maxAttempts - completedAttempts.length}</strong> lượt làm bài.</span>
                ) : (
                  <span className="text-rose-600 font-semibold">
                    Bạn đã sử dụng hết số lần làm bài cho phép.
                  </span>
                )}
              </div>

              {canTakeExam || hasActiveAttempt ? (
                <button
                  type="button"
                  disabled={starting}
                  onClick={handleStartExam}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 hover:scale-102"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {starting
                    ? "Đang chuẩn bị..."
                    : hasActiveAttempt
                    ? "Tiếp tục bài đang làm"
                    : "Bắt đầu làm bài"}
                </button>
              ) : (
                <Link
                  to={`/s/attempts/${completedAttempts[0]?.id}/result`}
                  className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Xem lại kết quả lượt trước
                </Link>
              )}
            </div>

            {/* Lịch sử các lần làm trước */}
            {completedAttempts.length > 0 && (
              <div className="pt-6 border-t border-slate-100 space-y-3">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4" /> Lịch sử các lần nộp bài của bạn
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {completedAttempts.map((att) => (
                    <div
                      key={att.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">
                          Lần làm thứ {att.attemptNo}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Nộp lúc: {formatDate(att.submittedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-sm text-emerald-600">
                          {att.score} / {att.maxScore} điểm
                        </span>
                        <Link
                          to={`/s/attempts/${att.id}/result`}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
