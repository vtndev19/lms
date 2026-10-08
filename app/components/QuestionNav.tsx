import React from "react";
import { Bookmark, CheckCircle2 } from "lucide-react";

interface QuestionNavProps {
  total: number;
  currentIndex: number;
  answers: Record<string, any>;
  questionIds: string[];
  flaggedIndices: Set<number>;
  onSelect: (index: number) => void;
  onToggleFlag?: (index: number) => void;
}

export const QuestionNav: React.FC<QuestionNavProps> = ({
  total,
  currentIndex,
  answers,
  questionIds,
  flaggedIndices,
  onSelect,
  onToggleFlag,
}) => {
  const answeredCount = questionIds.filter((id) => {
    const val = answers[id];
    if (val === undefined || val === null || val === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === "object" && !Array.isArray(val)) {
      return Object.values(val).some((v) => v !== null && v !== undefined);
    }
    return true;
  }).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs sticky top-20">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-800 text-sm">Danh sách câu hỏi</h3>
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
          {answeredCount}/{total} đã làm
        </span>
      </div>

      {/* Chú thích màu sắc */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-indigo-600" />
          <span>Đã chọn</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-slate-300 bg-white" />
          <span>Chưa chọn</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-400" />
          <span>Đánh dấu xem lại</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-indigo-600 bg-indigo-50" />
          <span>Đang xem</span>
        </div>
      </div>

      {/* Lưới số câu hỏi */}
      <div className="grid grid-cols-5 gap-2 max-h-[360px] overflow-y-auto pr-1">
        {Array.from({ length: total }).map((_, idx) => {
          const qId = questionIds[idx];
          const val = answers[qId];
          const hasAnswer =
            val !== undefined &&
            val !== null &&
            val !== "" &&
            (!Array.isArray(val) || val.length > 0) &&
            (typeof val !== "object" || Array.isArray(val) || Object.values(val).some((v) => v !== null));

          const isCurrent = currentIndex === idx;
          const isFlagged = flaggedIndices.has(idx);

          let btnClass = "border-slate-200 text-slate-700 bg-white hover:bg-slate-50";

          if (hasAnswer) {
            btnClass = "bg-indigo-600 text-white border-indigo-600 shadow-xs";
          }
          if (isFlagged) {
            btnClass += " ring-2 ring-amber-400";
          }
          if (isCurrent) {
            btnClass += " ring-2 ring-indigo-500 ring-offset-1 font-black";
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(idx)}
              className={`relative h-9 rounded-xl border text-xs font-bold transition-all flex items-center justify-center ${btnClass}`}
            >
              {idx + 1}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Nút đánh dấu câu hiện tại */}
      {onToggleFlag && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onToggleFlag(currentIndex)}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
              flaggedIndices.has(currentIndex)
                ? "bg-amber-50 text-amber-800 border-amber-300"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${flaggedIndices.has(currentIndex) ? "fill-amber-500 text-amber-500" : ""}`} />
            {flaggedIndices.has(currentIndex) ? "Bỏ đánh dấu câu này" : "Đánh dấu xem lại câu này"}
          </button>
        </div>
      )}
    </div>
  );
};
