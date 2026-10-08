import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { getExams, getClasses, deleteExam } from "../../lib/db";
import type { Exam, ClassRoom } from "../../lib/types";
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
} from "lucide-react";

export default function TeacherExamsPage() {
  const { userProfile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

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
    if (!confirm(`Bạn có chắc muốn xóa đề thi "${title}"? Toàn bộ câu hỏi và kết quả sẽ bị xóa vĩnh viễn.`)) {
      return;
    }

    try {
      await deleteExam(examId);
      await loadData();
    } catch (err: any) {
      alert("Lỗi xóa đề thi: " + err.message);
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
                Quản lý đề thi, câu hỏi trắc nghiệm, file đính kèm và thống kê bảng điểm
              </p>
            </div>

            <Link
              to="/t/exams/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all self-start sm:self-auto"
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
              <p className="text-xs text-slate-400 mt-3 font-medium">Đang tải danh sách đề thi từ Firestore...</p>
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

                      {exam.classIds && exam.classIds.length > 0 ? (
                        exam.classIds.map((cid) => (
                          <span
                            key={cid}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium"
                          >
                            {classMap.get(cid) || "Lớp học phần"}
                          </span>
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
        </main>
      </div>
    </ProtectedRoute>
  );
}
