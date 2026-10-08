import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { getExams, getClasses, getAttemptsByExamId } from "../../lib/db";
import type { Exam, ClassRoom, Attempt } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import {
  BookOpen,
  PlusCircle,
  Clock,
  Layers,
  Award,
  ArrowRight,
  CheckCircle2,
  FileText,
  Sparkles,
} from "lucide-react";

export default function StudentDashboard() {
  const { userProfile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [attemptsMap, setAttemptsMap] = useState<Record<string, Attempt[]>>({});
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [eList, cList] = await Promise.all([getExams(), getClasses()]);
        // Lọc các đề published
        const publishedExams = eList.filter((e) => e.status === "published");
        setExams(publishedExams);
        setClasses(cList);

        // Lấy lịch sử làm bài
        const atts: Record<string, Attempt[]> = {};
        for (const e of publishedExams) {
          const eAtts = await getAttemptsByExamId(e.id);
          atts[e.id] = eAtts.filter((a) => a.studentId === (userProfile?.uid || "demo-student-uid"));
        }
        setAttemptsMap(atts);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userProfile?.uid]);

  const classMap = new Map(classes.map((c) => [c.id, c.name]));

  const filteredExams = exams.filter((e) => {
    const studentAttempts = attemptsMap[e.id] || [];
    const hasSubmitted = studentAttempts.some((a) => a.status === "submitted");

    if (filter === "pending") return !hasSubmitted;
    if (filter === "completed") return hasSubmitted;
    return true;
  });

  return (
    <ProtectedRoute allowedRole="student">
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-500/10 mb-8 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-xs font-semibold backdrop-blur-xs mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Góc học tập của Học sinh
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-2">
                Xin chào, {userProfile?.name || "Học sinh"}!
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed mb-6">
                Xem danh sách bài tập được thầy cô giao, tải đề cương và bắt đầu làm bài kiểm tra trắc nghiệm trực tuyến.
              </p>

              <Link
                to="/s/join"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-emerald-800 font-bold text-xs shadow-md shadow-black/10 hover:bg-emerald-50 transition-all hover:scale-102"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" /> Tham gia lớp học phần mới
              </Link>
            </div>
          </div>

          {/* Header & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-6 h-6 text-emerald-600" />
                Bài tập & Đề thi được giao
              </h2>
              <span className="text-xs text-slate-500">
                Tìm thấy {filteredExams.length} bài tập khả dụng
              </span>
            </div>

            <div className="flex items-center gap-2">
              {[
                { id: "all", label: "Tất cả bài" },
                { id: "pending", label: "Chưa nộp" },
                { id: "completed", label: "Đã hoàn thành" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filter === tab.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách đề thi */}
          {filteredExams.length === 0 ? (
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map((exam) => {
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

                        <span className="text-[11px] font-semibold text-slate-400">
                          {exam.durationMin ? `${exam.durationMin} phút` : "Không giới hạn"}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base mb-2 leading-snug">
                        {exam.title}
                      </h3>

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
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
                      >
                        {hasSubmitted ? "Xem kết quả" : "Làm bài ngay"}{" "}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
