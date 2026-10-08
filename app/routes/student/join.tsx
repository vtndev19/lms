import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { getClasses } from "../../lib/db";
import { PlusCircle, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function StudentJoinClassPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setError("Mã tham gia lớp học phải có đúng 6 ký tự!");
      return;
    }

    setLoading(true);
    try {
      const classes = await getClasses();
      const matched = classes.find((c) => c.joinCode.toUpperCase() === cleanCode);

      if (!matched) {
        setError("Không tìm thấy lớp học nào với mã này. Vui lòng kiểm tra lại với thầy/cô.");
        return;
      }

      setSuccess(`Tham gia thành công lớp: ${matched.name}! Đang chuyển hướng...`);
      setTimeout(() => {
        navigate("/s");
      }, 1500);
    } catch (err: any) {
      setError("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRole="student">
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-lg w-full mx-auto px-4 py-12 flex flex-col justify-center">
          <Link
            to="/s"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-6 self-start"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách bài tập
          </Link>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <PlusCircle className="w-7 h-7" />
            </div>

            <h1 className="text-xl font-black text-slate-900 tracking-tight mb-2">
              Tham gia Lớp học phần
            </h1>
            <p className="text-xs text-slate-500 mb-6">
              Nhập mã gồm 6 ký tự do giáo viên cung cấp (ví dụ: 6I0ABC) để được giao các đề kiểm tra của lớp
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="MÃ 6 KÝ TỰ"
                  className="w-full text-center tracking-widest font-mono font-black text-2xl uppercase px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-200 transition-all disabled:opacity-50"
              >
                {loading ? "Đang kiểm tra..." : "Xác nhận tham gia lớp"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
