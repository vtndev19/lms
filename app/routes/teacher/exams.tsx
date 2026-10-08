import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { getExams, getClasses } from "../../lib/db";
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
} from "lucide-react";

export default function TeacherExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [eList, cList] = await Promise.all([getExams(), getClasses()]);
        setExams(eList);
        setClasses(cList);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
              <Plus className="w-4 h-4" /> Tạo đề thi mới
            </Link>
          </div>

          {/* Bộ lọc trạng thái */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            {[
              { id: "all", label: "Tất cả đề" },
              { id: "published", label: "Đã xuất bản (Mở)" },
              { id: "draft", label: "Bản nháp" },
              { id: "closed", label: "Đã đóng" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  filter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Danh sách đề thi */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400 text-sm">
              Không tìm thấy đề thi nào phù hợp.
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
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

                      {exam.classIds.map((cid) => (
                        <span
                          key={cid}
                          className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-100"
                        >
                          {classMap.get(cid) || cid}
                        </span>
                      ))}

                      <span className="text-xs text-slate-400 ml-auto lg:ml-0">
                        {formatDate(exam.createdAt)}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-lg leading-snug">
                      {exam.title}
                    </h3>

                    {exam.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{exam.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 pt-1">
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
                        <span className="flex items-center gap-1.5 text-blue-600">
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
