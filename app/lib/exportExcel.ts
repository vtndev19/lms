import type { Attempt, UserProfile, StudentImportItem } from "./types";
import { formatDate, formatDobToPassword } from "./utils";

export async function exportResultsToExcel(examTitle: string, attempts: Attempt[]) {
  const XLSX = await import("xlsx");

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

/**
 * Xuất danh sách học sinh của một lớp học ra file Excel
 */
export async function exportClassStudentsToExcel(
  className: string,
  students: { studentName: string; studentEmail?: string; studentCode?: string; joinedAt?: any }[]
) {
  const XLSX = await import("xlsx");

  const data = students.map((st, idx) => ({
    "STT": idx + 1,
    "Họ và tên": st.studentName || "Học sinh",
    "Mã học sinh": st.studentCode || "—",
    "Email": st.studentEmail || "—",
    "Ngày tham gia": formatDate(st.joinedAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Danh_sach_hoc_sinh");

  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 14 },
    { wch: 26 },
    { wch: 20 },
  ];

  const safeName = className.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, "_");
  XLSX.writeFile(workbook, `Danh_sach_lop_${safeName}.xlsx`);
}

/**
 * Xuất bảng điểm làm bài theo từng lớp cụ thể
 */
export async function exportClassExamResultsToExcel(
  examTitle: string,
  className: string,
  submissions: {
    student: { studentName: string; studentEmail?: string; studentCode?: string };
    status: string;
    score?: number | null;
    maxScore?: number | null;
    attemptCount?: number;
    submittedAt?: any;
    attempt?: Attempt;
  }[]
) {
  const XLSX = await import("xlsx");

  const data = submissions.map((sub, idx) => {
    let durationStr = "—";
    if (sub.attempt?.startedAt && sub.attempt?.submittedAt) {
      const startMs = new Date(sub.attempt.startedAt).getTime();
      const endMs = new Date(sub.attempt.submittedAt).getTime();
      const mins = Math.round((endMs - startMs) / 60000);
      durationStr = `${mins} phút`;
    }

    const statusText =
      sub.status === "submitted"
        ? "Đã nộp bài"
        : sub.status === "in_progress"
        ? "Đang làm bài"
        : "Chưa làm bài";

    return {
      "STT": idx + 1,
      "Họ và tên": sub.student.studentName || "Học sinh",
      "Mã học sinh": sub.student.studentCode || "—",
      "Email": sub.student.studentEmail || "—",
      "Lớp": className,
      "Trạng thái": statusText,
      "Điểm đạt được": sub.score !== null && sub.score !== undefined ? sub.score : "—",
      "Điểm tối đa": sub.maxScore || 10,
      "Số lần thi": sub.attemptCount || (sub.status === "submitted" ? 1 : 0),
      "Thời lượng làm": durationStr,
      "Thời điểm nộp": sub.submittedAt ? formatDate(sub.submittedAt) : "—",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Bang_diem_lop");

  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 14 },
    { wch: 24 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 20 },
  ];

  const safeTitle = `${examTitle}_${className}`.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, "_");
  XLSX.writeFile(workbook, `Ket_qua_${safeTitle}.xlsx`);
}

export async function downloadQuestionTemplateExcel(sampleData: any[]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CauHoi");
  XLSX.writeFile(wb, "mau_cauhoi.xlsx");
}

/**
 * Tải file Excel mẫu để nhập danh sách học sinh
 */
export async function downloadStudentTemplateExcel() {
  const XLSX = await import("xlsx");
  const sampleData = [
    {
      "Họ và tên": "Nguyễn Văn An",
      "Mã học sinh": "HS001",
      "Ngày sinh": "15/08/2008",
      "Lớp": "10A1",
      "Giới tính": "Nam",
      "Số điện thoại": "0912345678",
    },
    {
      "Họ và tên": "Trần Thị Mai",
      "Mã học sinh": "HS002",
      "Ngày sinh": "22/11/2008",
      "Lớp": "10A1",
      "Giới tính": "Nữ",
      "Số điện thoại": "0987654321",
    },
    {
      "Họ và tên": "Lê Hoàng Long",
      "Mã học sinh": "HS003",
      "Ngày sinh": "04/05/2008",
      "Lớp": "10A2",
      "Giới tính": "Nam",
      "Số điện thoại": "0901122334",
    },
    {
      "Họ và tên": "Phạm Quỳnh Anh",
      "Mã học sinh": "HS004",
      "Ngày sinh": "30/09/2008",
      "Lớp": "10A2",
      "Giới tính": "Nữ",
      "Số điện thoại": "0933221100",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DanhSachHocSinh");
  ws["!cols"] = [
    { wch: 24 }, // Họ và tên
    { wch: 14 }, // Mã học sinh
    { wch: 14 }, // Ngày sinh
    { wch: 12 }, // Lớp
    { wch: 10 }, // Giới tính
    { wch: 16 }, // Số điện thoại
  ];
  XLSX.writeFile(wb, "mau_nhap_hoc_sinh.xlsx");
}

/**
 * Tải file CSV mẫu (hỗ trợ mở trực tiếp trên Excel tiếng Việt không lỗi font)
 */
export function downloadStudentTemplateCsv() {
  const csvContent =
    "\uFEFF" + // UTF-8 BOM
    "Họ và tên,Mã học sinh,Ngày sinh,Lớp,Giới tính,Số điện thoại\n" +
    "Nguyễn Văn An,HS001,15/08/2008,10A1,Nam,0912345678\n" +
    "Trần Thị Mai,HS002,22/11/2008,10A1,Nữ,0987654321\n" +
    "Lê Hoàng Long,HS003,04/05/2008,10A2,Nam,0901122334\n" +
    "Phạm Quỳnh Anh,HS004,30/09/2008,10A2,Nữ,0933221100\n";

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mau_nhap_hoc_sinh.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Xuất danh sách tài khoản, username và mật khẩu học sinh ra Excel cho giáo viên bàn giao
 */
export async function exportStudentAccountsToExcel(students: UserProfile[]) {
  const XLSX = await import("xlsx");
  const data = students.map((s, idx) => ({
    "STT": idx + 1,
    "Mã học sinh": s.studentCode || "—",
    "Họ và tên": s.name || "—",
    "Lớp": s.className || "—",
    "Tên đăng nhập": s.username || (s.studentCode ? s.studentCode.toLowerCase() : "—"),
    "Mật khẩu ban đầu": s.initialPassword || formatDobToPassword(s.dob) || "123456",
    "Ngày sinh": s.dob || "—",
    "Email hệ thống": s.email || "—",
    "Số điện thoại": s.phone || "—",
    "Trạng thái": s.isBlocked ? "Đã khóa" : "Đang hoạt động",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "TaiKhoanHocSinh");
  ws["!cols"] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã học sinh
    { wch: 24 }, // Họ và tên
    { wch: 12 }, // Lớp
    { wch: 18 }, // Tên đăng nhập
    { wch: 18 }, // Mật khẩu ban đầu
    { wch: 14 }, // Ngày sinh
    { wch: 26 }, // Email hệ thống
    { wch: 16 }, // SĐT
    { wch: 16 }, // Trạng thái
  ];

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Danh_sach_tai_khoan_hoc_sinh_${dateStr}.xlsx`);
}

/**
 * Đọc và chuẩn hóa dữ liệu từ file Excel hoặc CSV được tải lên
 */
export async function parseStudentFile(file: File): Promise<StudentImportItem[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("File không chứa trang dữ liệu nào.");
  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const normalizeKey = (key: string): string => {
    return key
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const results: StudentImportItem[] = [];

  for (const row of rawRows) {
    const item: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      const nKey = normalizeKey(k);
      item[nKey] = String(v ?? "").trim();
    }

    const name =
      item["hovaten"] ||
      item["hoten"] ||
      item["ten"] ||
      item["name"] ||
      item["fullname"] ||
      "";

    const studentCode =
      item["mahocsinh"] ||
      item["mahs"] ||
      item["masv"] ||
      item["code"] ||
      item["studentcode"] ||
      item["id"] ||
      "";

    let dob =
      item["ngaysinh"] ||
      item["ns"] ||
      item["dob"] ||
      item["birthdate"] ||
      "";

    // Trường hợp Excel lưu ngày sinh dạng serial number (vd: 39675)
    if (/^\d{5}$/.test(dob)) {
      const serial = parseInt(dob, 10);
      const utc_days = Math.floor(serial - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      const dd = String(date_info.getDate()).padStart(2, "0");
      const mm = String(date_info.getMonth() + 1).padStart(2, "0");
      const yyyy = date_info.getFullYear();
      dob = `${dd}/${mm}/${yyyy}`;
    }

    const className =
      item["lop"] ||
      item["lophoc"] ||
      item["class"] ||
      item["classname"] ||
      "";

    const gender =
      item["gioitinh"] ||
      item["gt"] ||
      item["gender"] ||
      "";

    const phone =
      item["sodienthoai"] ||
      item["sdt"] ||
      item["phone"] ||
      item["tel"] ||
      "";

    const email =
      item["email"] ||
      item["mail"] ||
      "";

    if (name || studentCode) {
      results.push({
        name,
        studentCode,
        dob,
        className,
        gender,
        phone,
        email,
      });
    }
  }

  return results;
}

