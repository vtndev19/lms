import React from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  GraduationCap,
  BookOpen,
  Users,
  FileCheck,
  PlusCircle,
  LogOut,
  User,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { userProfile, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isTeacher = role === "teacher";

  const teacherLinks = [
    { to: "/t", label: "Tổng quan", icon: BookOpen },
    { to: "/t/classes", label: "Lớp học", icon: Users },
    { to: "/t/students", label: "Học sinh", icon: GraduationCap },
    { to: "/t/exams", label: "Đề trắc nghiệm", icon: FileCheck },
  ];

  const studentLinks = [
    { to: "/s", label: "Lớp học & Bài tập", icon: BookOpen },
    { to: "/s/join", label: "Tham gia lớp", icon: PlusCircle },
  ];

  const links = isTeacher ? teacherLinks : studentLinks;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link to={isTeacher ? "/t" : "/s"} prefetch="intent" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                  LMS Trắc Nghiệm
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 font-semibold px-1.5 py-0.5 rounded border border-indigo-200/50">
                    v1.0
                  </span>
                </span>
                <span className="text-xs text-slate-500">Hệ thống thi & bài tập</span>
              </div>
            </Link>

            {/* Role Links */}
            <nav className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const Icon = link.icon;
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    prefetch="intent"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-indigo-50 text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action & User Profile */}
          <div className="flex items-center gap-3">
            {/* Role indicator badge */}
            <span
              className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                isTeacher
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {isTeacher ? "Giáo viên" : "Học sinh"}
            </span>

            {/* User Info */}
            <div className="flex items-center gap-2.5 pl-2 sm:border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                {userProfile?.name ? userProfile.name.charAt(0) : <User className="w-4 h-4" />}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  {userProfile?.name || "Người dùng"}
                </span>
                <span className="text-[11px] text-slate-400">
                  {userProfile?.email || ""}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
