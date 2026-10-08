import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth, getFirebaseErrorMessage } from "../../context/AuthContext";
import type { UserRole } from "../../lib/types";
import { GoogleIcon } from "./login";
import {
  GraduationCap,
  UserPlus,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  BookOpen,
} from "lucide-react";

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("student");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const profile = await register(email.trim(), password, name.trim(), role);
      navigate(profile.role === "teacher" ? "/t" : "/s");
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const profile = await loginWithGoogle(role);
      navigate(profile.role === "teacher" ? "/t" : "/s");
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-3">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Tạo tài khoản mới</h2>
        <p className="mt-1 text-xs text-indigo-200">
          Đăng ký để bắt đầu làm bài hoặc tạo đề trắc nghiệm
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-white/20">
          {/* LỰA CHỌN VAI TRÒ TRƯỚC TIÊN */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Bạn tham gia hệ thống với vai trò nào?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  role === "student"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className={`w-4 h-4 ${role === "student" ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="font-bold text-xs">Học sinh</span>
                </div>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Làm bài thi, xem kết quả và nộp bài
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  role === "teacher"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className={`w-4 h-4 ${role === "teacher" ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className="font-bold text-xs">Giáo viên</span>
                </div>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Tạo lớp, tạo đề, import câu hỏi & chấm điểm
                </span>
              </button>
            </div>
          </div>

          {/* ĐĂNG KÝ BẰNG GMAIL / GOOGLE */}
          <button
            type="button"
            disabled={googleLoading}
            onClick={handleGoogleRegister}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-3 hover:border-slate-400 hover:shadow-md disabled:opacity-60 mb-5"
          >
            <GoogleIcon />
            <span>
              {googleLoading
                ? "Đang kết nối Google..."
                : `Đăng ký nhanh bằng Gmail (${role === "teacher" ? "Giáo viên" : "Học sinh"})`}
            </span>
          </button>

          {/* Dòng phân cách */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-400 font-semibold uppercase tracking-wider">
                hoặc điền thông tin
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn An"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? "Đang tạo tài khoản..." : "Hoàn tất đăng ký"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-800">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
