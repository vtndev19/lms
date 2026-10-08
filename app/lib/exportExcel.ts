import * as XLSX from "xlsx";
import type { Attempt } from "./types";
import { formatDate } from "./utils";

export function exportResultsToExcel(examTitle: string, attempts: Attempt[]) {
  const data = attempts.map((att, idx) => {
    let durationStr = "—";
    if (att.startedAt && att.submittedAt) {
      const startMs = att.startedAt.seconds ? att.startedAt.seconds * 1000 : new Date(att.startedAt).getTime();
      const endMs = att.submittedAt.seconds ? att.submittedAt.seconds * 1000 : new Date(att.submittedAt).getTime();
      const mins = Math.round((endMs - startMs) / 60000);
      durationStr = `${mins} phút`;
    }

    return {
      "STT": idx + 1,
      "Họ và tên": att.studentName || "Học sinh",
      "Lớp": att.classId || "—",
      "Lần làm": `Lần ${att.attemptNo || 1}`,
      "Điểm đạt được": att.score !== null ? att.score : "Chưa chấm",
      "Điểm tối đa": att.maxScore || 10,
      "Thời lượng làm": durationStr,
      "Thời điểm nộp": formatDate(att.submittedAt),
      "Trạng thái": att.status === "submitted" ? "Đã nộp" : att.status === "expired" ? "Hết giờ" : "Đang làm",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Bảng điểm");

  // Đặt độ rộng cột tự động
  worksheet["!cols"] = [
    { wch: 6 },  // STT
    { wch: 24 }, // Tên
    { wch: 12 }, // Lớp
    { wch: 10 }, // Lần làm
    { wch: 14 }, // Điểm
    { wch: 12 }, // Max
    { wch: 16 }, // Thời lượng
    { wch: 20 }, // Nộp lúc
    { wch: 14 }, // Trạng thái
  ];

  const safeTitle = examTitle.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, "_");
  XLSX.writeFile(workbook, `Bang_diem_${safeTitle}.xlsx`);
}
