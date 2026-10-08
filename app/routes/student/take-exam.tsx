import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { QuestionRenderer } from "../../components/QuestionRenderer";
import { QuestionNav } from "../../components/QuestionNav";
import { Timer } from "../../components/Timer";
import {
  getAttemptById,
  getExamById,
  getQuestionsByExamId,
  getAnswerKeysByExamId,
  saveAttempt,
} from "../../lib/db";
import { evaluateAttempt } from "../../lib/grading";
import { shuffleWithSeed } from "../../lib/utils";
import type { Attempt, Exam, Question, AnswerKey } from "../../lib/types";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Menu,
  X,
  CheckCircle2,
} from "lucide-react";

export default function TakeExamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answerKeys, setAnswerKeys] = useState<Record<string, AnswerKey>>({});
  const [loading, setLoading] = useState(true);

  // Trạng thái làm bài
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedIndices, setFlaggedIndices] = useState<Set<number>>(new Set());
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Ref cho auto-save debounce
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  async function loadData(attemptId: string) {
    setLoading(true);
    try {
      const att = await getAttemptById(attemptId);
      if (!att) {
        alert("Không tìm thấy lượt làm bài này!");
        navigate("/s");
        return;
      }

      if (att.status === "submitted") {
        // Nếu đã nộp rồi thì chuyển thẳng sang trang kết quả
        navigate(`/s/attempts/${attemptId}/result`);
        return;
      }

      setAttempt(att);
      setAnswers(att.answers || {});

      const [eDoc, qList, kList] = await Promise.all([
        getExamById(att.examId),
        getQuestionsByExamId(att.examId),
        getAnswerKeysByExamId(att.examId),
      ]);

      setExam(eDoc);
      setAnswerKeys(kList);

      // Xử lý xáo trộn câu hỏi nếu đề thi có cấu hình
      let processedQuestions = [...qList];
      if (eDoc?.shuffleQuestions && att.seed) {
        processedQuestions = shuffleWithSeed(processedQuestions, att.seed);
      }

      // Xáo trộn phương án nếu có
      if (eDoc?.shuffleOptions && att.seed) {
        processedQuestions = processedQuestions.map((q, idx) => {
          if (["single", "multiple"].includes(q.type) && q.options.length > 0) {
            return {
              ...q,
              options: shuffleWithSeed(q.options, att.seed + idx),
            };
          }
          return q;
        });
      }

      setQuestions(processedQuestions);
    } catch (err) {
      console.error("Lỗi nạp bài thi:", err);
    } finally {
      setLoading(false);
    }
  }

  // Tự động lưu nháp debounce
  const triggerAutoSave = (newAnswers: Record<string, any>) => {
    if (!attempt) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveAttempt({
          ...attempt,
          answers: newAnswers,
        });
      } catch (err) {
        console.warn("Lỗi tự lưu nháp:", err);
      }
    }, 1500);
  };

  const handleAnswerChange = (qId: string, val: any) => {
    const updated = { ...answers, [qId]: val };
    setAnswers(updated);
    triggerAutoSave(updated);
  };

  const handleToggleFlag = (index: number) => {
    const next = new Set(flaggedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setFlaggedIndices(next);
  };

  const handleSubmit = async () => {
    if (!attempt || !exam || submitting) return;
    setSubmitting(true);

    try {
      // Đánh giá điểm số
      const evalRes = evaluateAttempt(
        questions,
        answerKeys,
        answers,
        exam.showAnswers === "afterSubmit"
      );

      const updatedAttempt: Attempt = {
        ...attempt,
        status: "submitted",
        submittedAt: new Date().toISOString(),
        answers,
        score: evalRes.score,
        maxScore: evalRes.maxScore,
        detail: evalRes.detail,
      };

      await saveAttempt(updatedAttempt);
      navigate(`/s/attempts/${attempt.id}/result`);
    } catch (err: any) {
      alert("Lỗi nộp bài: " + err.message);
      setSubmitting(false);
    }
  };

  const handleTimeExpire = () => {
    alert("Thời gian làm bài đã kết thúc! Hệ thống sẽ tự động nộp bài của bạn.");
    handleSubmit();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Đang chuẩn bị đề thi...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const questionIds = questions.map((q) => q.id);
  const total = questions.length;

  const answeredCount = questionIds.filter((qId) => {
    const val = answers[qId];
    if (val === undefined || val === null || val === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === "object" && !Array.isArray(val)) {
      return Object.values(val).some((v) => v !== null && v !== undefined);
    }
    return true;
  }).length;

  return (
    <ProtectedRoute allowedRole="student">
      <div className="min-h-screen bg-slate-100 flex flex-col select-none">
        {/* Top Header thanh làm bài */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Tiêu đề & Nút rời khỏi */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Bạn có chắc muốn tạm dừng? Tiến trình của bạn đã được tự động lưu nháp.")) {
                      navigate(`/s/exams/${exam?.id}`);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Tạm rời khỏi bài thi"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="hidden sm:block">
                  <h1 className="text-sm font-bold text-slate-900 truncate max-w-xs md:max-w-md">
                    {exam?.title}
                  </h1>
                  <span className="text-[11px] text-slate-400">
                    Đã hoàn thành {answeredCount}/{total} câu
                  </span>
                </div>
              </div>

              {/* Đồng hồ đếm ngược & Nút nộp */}
              <div className="flex items-center gap-3">
                <Timer deadline={attempt?.deadline} onExpire={handleTimeExpire} />

                {/* Mobile drawer toggle */}
                <button
                  type="button"
                  onClick={() => setShowMobileNav(!showMobileNav)}
                  className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Nộp bài
                </button>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-1">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${total > 0 ? (answeredCount / total) * 100 : 0}%` }}
            />
          </div>
        </header>

        {/* Thân trang làm bài */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Cột chính: Câu hỏi hiện tại */}
            <div className="lg:col-span-3 space-y-4">
              {currentQuestion ? (
                <>
                  <QuestionRenderer
                    index={currentIndex}
                    question={currentQuestion}
                    mode="answering"
                    value={answers[currentQuestion.id]}
                    onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                  />

                  {/* Nút điều hướng Trước / Sau */}
                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex(currentIndex - 1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Câu trước
                    </button>

                    <span className="text-xs font-bold text-slate-500">
                      Câu {currentIndex + 1} / {total}
                    </span>

                    {currentIndex < total - 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentIndex(currentIndex + 1)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
                      >
                        Câu tiếp <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowConfirmSubmit(true)}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Hoàn thành
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                  Không tìm thấy câu hỏi.
                </div>
              )}
            </div>

            {/* Cột phải: Bảng điều hướng câu hỏi (Desktop) */}
            <div className="hidden lg:block">
              <QuestionNav
                total={total}
                currentIndex={currentIndex}
                answers={answers}
                questionIds={questionIds}
                flaggedIndices={flaggedIndices}
                onSelect={(idx) => setCurrentIndex(idx)}
                onToggleFlag={handleToggleFlag}
              />
            </div>
          </div>
        </main>

        {/* Drawer Bảng điều hướng trên Mobile */}
        {showMobileNav && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs lg:hidden">
            <div className="bg-white w-80 h-full p-4 overflow-y-auto flex flex-col shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="font-bold text-sm text-slate-900">Danh sách câu hỏi</span>
                <button
                  type="button"
                  onClick={() => setShowMobileNav(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <QuestionNav
                total={total}
                currentIndex={currentIndex}
                answers={answers}
                questionIds={questionIds}
                flaggedIndices={flaggedIndices}
                onSelect={(idx) => {
                  setCurrentIndex(idx);
                  setShowMobileNav(false);
                }}
                onToggleFlag={handleToggleFlag}
              />
            </div>
          </div>
        )}

        {/* Modal Xác nhận nộp bài */}
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 text-center animate-in fade-in zoom-in-95 duration-150">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Send className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1">Xác nhận nộp bài thi?</h3>
              <p className="text-xs text-slate-500 mb-4">
                Bạn đã trả lời <strong>{answeredCount}</strong> / <strong>{total}</strong> câu hỏi.
                {answeredCount < total && (
                  <span className="text-rose-600 block mt-1 font-semibold">
                    Lưu ý: Bạn vẫn còn {total - answeredCount} câu chưa chọn đáp án!
                  </span>
                )}
              </p>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Tiếp tục làm bài
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
                >
                  {submitting ? "Đang chấm điểm..." : "Nộp bài ngay"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
