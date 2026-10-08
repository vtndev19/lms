import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import confetti from "canvas-confetti";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { QuestionRenderer } from "../../components/QuestionRenderer";
import {
  getAttemptById,
  getExamById,
  getQuestionsByExamId,
  getAnswerKeysByExamId,
} from "../../lib/db";
import type { Attempt, Exam, Question, AnswerKey } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import {
  Award,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  RotateCcw,
} from "lucide-react";

export default function ExamResultPage() {
  const { id } = useParams<{ id: string }>();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answerKeys, setAnswerKeys] = useState<Record<string, AnswerKey>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  async function loadData(attemptId: string) {
    setLoading(true);
    try {
      const att = await getAttemptById(attemptId);
      if (!att) return;
      setAttempt(att);

      const [eDoc, qList, kList] = await Promise.all([
        getExamById(att.examId),
        getQuestionsByExamId(att.examId),
        getAnswerKeysByExamId(att.examId),
      ]);
      setExam(eDoc);
      setQuestions(qList);
      setAnswerKeys(kList);

      // Bắn pháo hoa ăn mừng nếu điểm cao (>= 50%)
      if (att.score && att.maxScore && att.score / att.maxScore >= 0.5) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!attempt || !exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-500 mb-4">Không tìm thấy kết quả làm bài.</p>
        <Link to="/s" className="text-indigo-600 font-bold text-sm">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const score = attempt.score ?? 0;
  const maxScore = attempt.maxScore ?? exam.totalPoints ?? 10;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  // Tính thời gian làm bài
  let durationStr = "—";
  if (attempt.startedAt && attempt.submittedAt) {
    const start = new Date(attempt.startedAt).getTime();
    const end = new Date(attempt.submittedAt).getTime();
    const mins = Math.round((end - start) / 60000);
    durationStr = `${mins} phút`;
  }

  const canShowAnswers = exam.showAnswers !== "never";

  return (
    <ProtectedRoute allowedRole="student">
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <Link
            to="/s"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách bài tập
          </Link>

          {/* Banner Kết quả & Điểm số */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Đã hoàn thành bài thi
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{exam.title}</h1>
              <p className="text-xs text-indigo-200 flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                <span>Lần làm thứ {attempt.attemptNo}</span>
                <span>•</span>
                <span>Thời gian làm: {durationStr}</span>
                <span>•</span>
                <span>Nộp lúc: {formatDate(attempt.submittedAt)}</span>
              </p>
            </div>

            {/* Score circle badge */}
            <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shrink-0 self-center sm:self-auto min-w-[160px]">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-1">
                Điểm đạt được
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{score}</span>
                <span className="text-sm font-semibold text-indigo-300">/ {maxScore}</span>
              </div>
              <span className="mt-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                {percentage}% số điểm
              </span>
            </div>
          </div>

          {/* Chi tiết từng câu hỏi */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Chi tiết bài làm
              </h2>
              {!canShowAnswers && (
                <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  Đề thi này không mở đáp án công khai
                </span>
              )}
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => {
                const detail = attempt.detail ? attempt.detail[q.id] : undefined;
                const studentAnswer = attempt.answers ? attempt.answers[q.id] : undefined;
                const key = answerKeys[q.id];

                return (
                  <QuestionRenderer
                    key={q.id}
                    index={idx}
                    question={q}
                    mode="review"
                    value={studentAnswer}
                    resultDetail={
                      detail || {
                        earned: 0,
                        correct: canShowAnswers ? key?.correct : undefined,
                        explanation: canShowAnswers ? key?.explanation : undefined,
                      }
                    }
                  />
                );
              })}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center pt-4">
            <Link
              to="/s"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all"
            >
              Quay về trang chủ học sinh
            </Link>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
