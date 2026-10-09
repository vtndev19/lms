import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(val: any): string {
  if (!val) return "—";
  try {
    let date: Date | null = null;
    if (typeof val?.toDate === "function") {
      date = val.toDate();
    } else if (val instanceof Date) {
      date = val;
    } else if (typeof val === "number") {
      date = new Date(val);
    } else if (typeof val === "string") {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) {
        date = parsed;
      }
    } else if (val?.seconds) {
      date = new Date(val.seconds * 1000);
    } else if (val?._seconds) {
      date = new Date(val._seconds * 1000);
    }

    if (!date || isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return "—";
  }
}

export function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return "Không giới hạn";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours} giờ ${remaining} phút` : `${hours} giờ`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Pseudo-Random Number Generator có seed
export function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const rng = createSeededRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Xóa dấu tiếng Việt và chuẩn hóa chuỗi
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Định dạng ngày sinh thành mật khẩu mặc định (ddMMyyyy)
 * Ví dụ: "15/08/2008" -> "15082008", "2008-08-15" -> "15082008"
 */
export function formatDobToPassword(dob?: string): string {
  if (!dob) return "123456";
  const trimmed = dob.trim();

  // Đã là 8 chữ số liên tiếp
  if (/^\d{8}$/.test(trimmed)) return trimmed;

  // Dạng dd/MM/yyyy hoặc dd-MM-yyyy hoặc dd.MM.yyyy
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${day}${month}${year}`;
  }

  // Dạng yyyy-MM-dd hoặc yyyy/MM/dd
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${day}${month}${year}`;
  }

  // Trích xuất các chữ số
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 6) {
    return digits.slice(0, 8);
  }

  return "123456";
}

/**
 * Tự động tạo tên đăng nhập cho học sinh
 * Ưu tiên mã học sinh (dạng chữ thường không dấu, vd: hs001)
 */
export function generateStudentUsername(name: string, studentCode?: string): string {
  if (studentCode && studentCode.trim()) {
    const clean = studentCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean) return clean;
  }

  const normalized = removeVietnameseTones(name.trim()).toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return `hs_${Math.floor(1000 + Math.random() * 9000)}`;

  const lastName = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map((p) => p[0]).join("");
  return `${lastName}${initials}_${Math.floor(100 + Math.random() * 900)}`;
}

/**
 * Phân tích chuỗi CSV/TSV thành danh sách object
 */
export function parseCsvString(text: string): Record<string, string>[] {
  if (!text || !text.trim()) return [];

  // Tự động nhận diện dấu phân cách: dấu phẩy, chấm phẩy hoặc tab
  const firstLine = text.split(/\r?\n/)[0] || "";
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.includes(";") && !firstLine.includes(",")) delimiter = ";";

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Bỏ qua nháy kép escape
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.replace(/^["']|["']$/g, "").trim());
  const results: Record<string, string>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      obj[key] = (row[c] || "").replace(/^["']|["']$/g, "").trim();
    }
    results.push(obj);
  }

  return results;
}

