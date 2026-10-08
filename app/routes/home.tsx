import React from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  BookOpen,
  Users,
  Award,
  ShieldCheck,
  Zap,
  Upload,
} from "lucide-react";

export default function HomePage() {
  const { userProfile, role, loginDemo } = useAuth();

  if (userProfile) {
    return <Navigate to={role === "teacher" ? "/t" : "/s"} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-black text-slate-900 text-lg tracking-tight">
              LMS Trắc Nghiệm
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 rounded-xl transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all"
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/60 mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          Hệ thống E-learning Trắc nghiệm Thông minh v1.0
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mb-6">
          Nền tảng Giao Bài & Thi Trắc Nghiệm{" "}
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Chuẩn Server-side
          </span>
        </h1>

        <p className="text-slate-500 text-base sm:text-lg max-w-2xl leading-relaxed mb-10">
          Hỗ trợ 4 dạng câu hỏi (1 đáp án, nhiều đáp án, đúng/sai 4 ý, điền từ), công thức Toán KaTeX,
          import đề tự động từ Excel/JSON và tự động chấm điểm bảo mật trên máy chủ.
        </p>

        {/* Quick Demo Access Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16">
          <button
            type="button"
            onClick={() => loginDemo("teacher")}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 hover:scale-102"
          >
            Trải nghiệm là Giáo viên <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => loginDemo("student")}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 hover:scale-102"
          >
            Trải nghiệm là Học sinh <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full max-w-5xl">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">4 Dạng câu hỏi trắc nghiệm</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Trắc nghiệm 1 đáp án, nhiều đáp án, Đúng/Sai 4 ý (a, b, c, d) và câu hỏi trả lời ngắn/số học có sai số.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">Import Excel & JSON 3 bước</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Kiểm tra lỗi từng dòng, xem trước câu hỏi có công thức Toán và import hàng trăm câu chỉ với một cú nhấp.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">Bảo mật Server Timestamp</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tách biệt hoàn toàn đáp án khỏi client, chấm điểm ở server và đồng bộ thời gian đếm ngược chính xác.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © 2026 LMS Trắc Nghiệm • Xây dựng theo tài liệu SDD Elearning Trắc Nghiệm v1.0
      </footer>
    </div>
  );
}
