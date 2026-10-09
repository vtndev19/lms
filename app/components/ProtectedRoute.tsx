import React, { useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../lib/types";
import { AlertCircle, BookOpen } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { userProfile, role, loading, switchRole } = useAuth();
  const [switching, setSwitching] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    const handleSwitch = async () => {
      setSwitching(true);
      await switchRole(allowedRole);
      setSwitching(false);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Yêu cầu quyền {allowedRole === "teacher" ? "Giáo viên" : "Học sinh"}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tài khoản hiện tại của bạn (<strong>{userProfile.name}</strong> - {userProfile.email}) đang ở vai trò <strong>{role === "teacher" ? "Giáo viên" : "Học sinh"}</strong>.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleSwitch}
              disabled={switching}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              {switching ? "Đang chuyển..." : `Chuyển tài khoản sang ${allowedRole === "teacher" ? "Giáo viên" : "Học sinh"}`}
            </button>
            <Link
              to={role === "teacher" ? "/t" : "/s"}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
            >
              Về trang {role === "teacher" ? "Giáo viên" : "Học sinh"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
