import React, { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface TimerProps {
  deadline: any; // Date, string, or timestamp
  onExpire?: () => void;
}

export const Timer: React.FC<TimerProps> = ({ deadline, onExpire }) => {
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) {
      setTimeLeftMs(null);
      return;
    }

    let deadlineDate: Date;
    if (deadline.toDate && typeof deadline.toDate === "function") {
      deadlineDate = deadline.toDate();
    } else if (deadline.seconds) {
      deadlineDate = new Date(deadline.seconds * 1000);
    } else if (typeof deadline === "string" || typeof deadline === "number") {
      deadlineDate = new Date(deadline);
    } else if (deadline instanceof Date) {
      deadlineDate = deadline;
    } else {
      setTimeLeftMs(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = deadlineDate.getTime() - now;

      if (diff <= 0) {
        setTimeLeftMs(0);
        clearInterval(interval);
        if (onExpire) onExpire();
      } else {
        setTimeLeftMs(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  if (timeLeftMs === null) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
        <Clock className="w-4 h-4 text-slate-400" />
        <span>Không giới hạn giờ</span>
      </div>
    );
  }

  const totalSec = Math.floor(timeLeftMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  const timeFormatted =
    hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;

  const isCritical = totalSec <= 60; // Dưới 1 phút
  const isWarning = totalSec <= 300 && !isCritical; // Dưới 5 phút

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-bold border transition-all ${
        isCritical
          ? "bg-rose-50 text-rose-700 border-rose-300 animate-pulse shadow-sm shadow-rose-100"
          : isWarning
          ? "bg-amber-50 text-amber-700 border-amber-300"
          : "bg-slate-100 text-slate-800 border-slate-200"
      }`}
    >
      {isCritical ? (
        <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
      ) : (
        <Clock className={`w-4 h-4 ${isWarning ? "text-amber-600" : "text-indigo-600"}`} />
      )}
      <span className="font-mono tracking-wider">{timeFormatted}</span>
      {isWarning && <span className="text-[11px] font-medium hidden sm:inline">(Sắp hết giờ)</span>}
      {isCritical && <span className="text-[11px] font-bold text-rose-600 hidden sm:inline">(Khẩn cấp!)</span>}
    </div>
  );
};
