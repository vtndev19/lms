import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { getClasses, getExams } from "../../lib/db";
import type { ClassRoom, Exam } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import {
  FileText,
  Users,
  Plus,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
} from "lucide-react";

export default function TeacherDashboard() {
  const { userProfile } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [cList, eList] = await Promise.all([getClasses(), getExams()]);
        setClasses(cList);
        setExams(eList);
      } catch (err) {
        console.error("Lỗi tải dữ liệu dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalQuestions = exams.reduce((acc, e) => acc + (e.questionCount || 0), 0);

  return (
    <ProtectedRoute allowedRole="teacher">
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10 mb-8 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
              <Sparkles className="w-64 h-64" />
            </div>

            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-semibold backdrop-blur-xs mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Không gian làm việc Giáo viên
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-2">
                Xin chào, {userProfile?.name || "Thầy/Cô"}!
              </h1>
              <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                Quản lý các lớp học phần, tạo đề kiểm tra 4 dạng câu hỏi, nhập đề tự động từ Excel/JSON và theo dõi tiến độ làm bài của học sinh.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/t/exams/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-indigo-700 font-bold text-xs shadow-md shadow-black/10 hover:bg-indigo-50 transition-all hover:scale-102"
                >
                  <Plus className="w-4 h-4" /> Tạo đề thi mới
                </Link>
                <Link
                  to="/t/classes"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-500/40 hover:bg-indigo-500/60 text-white font-bold text-xs border border-white/20 transition-all"
                >
                  <Users className="w-4 h-4" /> Quản lý lớp học
                </Link>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Lớp phụ trách
                </span>
                <span className="text-2xl font-black text-slate-900">{classes.length}</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Đề kiểm tra
                </span>
                <span className="text-2xl font-black text-slate-900">{exams.length}</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Tổng số câu hỏi
                </span>
                <span className="text-2xl font-black text-slate-900">{totalQuestions}</span>
              </div>
            </div>
          </div>

          {/* Recent Exams & Classes Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Đề thi gần đây (2 cột) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Đề thi gần đây</h2>
                <Link
                  to="/t/exams"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {exams.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400 text-sm">
                  Chưa có đề thi nào. Hãy bấm "Tạo đề thi mới" để bắt đầu!
                </div>
              ) : (
                <div className="space-y-3">
                  {exams.slice(0, 5).map((exam) => (
                    <div
                      key={exam.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              exam.status === "published"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : exam.status === "closed"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {exam.status === "published"
                              ? "Đã mở"
                              : exam.status === "closed"
                              ? "Đã đóng"
                              : "Bản nháp"}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDate(exam.createdAt)}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">{exam.title}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-3">
                          <span>{exam.questionCount || 0} câu hỏi</span>
                          <span>•</span>
                          <span>{exam.durationMin ? `${exam.durationMin} phút` : "Không giới hạn"}</span>
                          <span>•</span>
                          <span>Tổng {exam.totalPoints || 0} điểm</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <Link
                          to={`/t/exams/${exam.id}/questions`}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-colors"
                        >
                          Câu hỏi
                        </Link>
                        <Link
                          to={`/t/exams/${exam.id}/results`}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                        >
                          Bảng điểm
                        </Link>
                        <Link
                          to={`/t/exams/${exam.id}`}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
                        >
                          Sửa
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danh sách lớp học (1 cột) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Lớp học phần</h2>
                <Link
                  to="/t/classes"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Tất cả <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{cls.name}</h4>
                      <span className="text-xs text-slate-500">
                        {cls.studentCount || 0} học sinh
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Mã vào lớp
                      </span>
                      <span className="font-mono font-black text-indigo-600 text-sm tracking-wider">
                        {cls.joinCode}
                      </span>
                    </div>
                  </div>
                ))}

                <Link
                  to="/t/classes"
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors mt-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm lớp học mới
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
