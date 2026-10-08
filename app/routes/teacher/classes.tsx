import React, { useEffect, useState } from "react";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { getClasses, createClass } from "../../lib/db";
import type { ClassRoom } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import { Users, Plus, Copy, Check, Sparkles, School } from "lucide-react";

export default function TeacherClassesPage() {
  const { userProfile } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    setLoading(true);
    try {
      const list = await getClasses();
      setClasses(list);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      await createClass(newClassName.trim(), userProfile?.uid || "demo-teacher-uid");
      setNewClassName("");
      setShowModal(false);
      await loadClasses();
    } catch (err: any) {
      alert("Lỗi tạo lớp: " + err.message);
    }
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <ProtectedRoute allowedRole="teacher">
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <School className="w-7 h-7 text-indigo-600" />
                Quản lý Lớp học phần
              </h1>
              <p className="text-slate-500 text-xs mt-1">
                Tạo lớp và chia sẻ mã 6 ký tự để học sinh tự tham gia vào lớp của bạn
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Thêm lớp học mới
            </button>
          </div>

          {/* Danh sách lớp học */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Users className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {cls.studentCount || 0} học sinh
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-lg mb-1">{cls.name}</h3>
                  <span className="text-[11px] text-slate-400 block mb-6">
                    Tạo lúc: {formatDate(cls.createdAt)}
                  </span>
                </div>

                {/* Mã tham gia */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Mã tham gia lớp
                    </span>
                    <span className="font-mono text-xl font-black text-indigo-600 tracking-wider">
                      {cls.joinCode}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyCode(cls.joinCode, cls.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      copiedId === cls.id
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {copiedId === cls.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Đã sao chép
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Sao chép mã
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Tạo lớp mới */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
                <h3 className="font-bold text-slate-900 text-base mb-1">Thêm lớp học mới</h3>
                <p className="text-xs text-slate-500 mb-5">
                  Nhập tên lớp học. Hệ thống sẽ tự động cấp một mã gồm 6 ký tự ngẫu nhiên.
                </p>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp học</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="Ví dụ: 6I0 - Tin học, 10A1..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100"
                    >
                      Tạo lớp
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
