import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { UserProfile, UserRole } from "../lib/types";

export function getFirebaseErrorMessage(error: any): string {
  const code = error?.code || "";
  switch (code) {
    case "auth/invalid-email":
      return "Địa chỉ email không hợp lệ.";
    case "auth/user-not-found":
      return "Tài khoản không tồn tại. Vui lòng đăng ký trước.";
    case "auth/wrong-password":
      return "Mật khẩu không chính xác.";
    case "auth/invalid-credential":
      return "Email hoặc mật khẩu không chính xác. Vui lòng thử lại.";
    case "auth/email-already-in-use":
      return "Email này đã được đăng ký. Bạn có thể đăng nhập hoặc dùng email khác.";
    case "auth/weak-password":
      return "Mật khẩu quá yếu. Vui lòng đặt mật khẩu từ 6 ký tự trở lên.";
    case "auth/popup-closed-by-user":
      return "Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất.";
    case "auth/popup-blocked":
      return "Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép mở pop-up để đăng nhập.";
    case "auth/cancelled-popup-request":
      return "Yêu cầu đăng nhập pop-up đã bị hủy.";
    case "auth/network-request-failed":
      return "Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền internet.";
    case "auth/too-many-requests":
      return "Tài khoản bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ít phút.";
    default:
      return error?.message || "Đã xảy ra lỗi trong quá trình xác thực.";
  }
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<UserProfile>;
  register: (email: string, pass: string, name: string, role: UserRole) => Promise<UserProfile>;
  loginWithGoogle: (role?: UserRole) => Promise<UserProfile>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  loginDemo: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_TEACHER: UserProfile = {
  uid: "demo-teacher-uid",
  name: "Thầy Nguyễn Văn An (Demo)",
  email: "giaovien@demo.edu.vn",
  role: "teacher",
  classIds: ["demo-class-6i0", "demo-class-7a1"],
};

const DEMO_STUDENT: UserProfile = {
  uid: "demo-student-uid",
  name: "Trần Minh Quân (Demo)",
  email: "hocsinh@demo.edu.vn",
  role: "student",
  classIds: ["demo-class-6i0"],
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("lms_demo_user");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEMO_TEACHER;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDemo = localStorage.getItem("lms_demo_user");
      if (savedDemo) {
        try {
          setUserProfile(JSON.parse(savedDemo));
          setLoading(false);
          return;
        } catch {}
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as Omit<UserProfile, "uid">;
            setUserProfile({
              uid: user.uid,
              ...data,
            });
          } else {
            const fallback: UserProfile = {
              uid: user.uid,
              name: user.displayName || user.email?.split("@")[0] || "Người dùng",
              email: user.email || "",
              role: "student",
              classIds: [],
            };
            setUserProfile(fallback);
          }
        } catch (err) {
          console.error("Lỗi tải thông tin user:", err);
        }
      } else {
        // Chỉ xóa userProfile nếu không đang ở chế độ demo
        if (typeof window !== "undefined" && !localStorage.getItem("lms_demo_user")) {
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, pass: string): Promise<UserProfile> => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lms_demo_user");
    }
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    let profile: UserProfile = {
      uid: cred.user.uid,
      name: cred.user.displayName || email.split("@")[0],
      email: cred.user.email || email,
      role: "student",
      classIds: [],
    };

    try {
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      if (userDoc.exists()) {
        profile = {
          uid: cred.user.uid,
          ...(userDoc.data() as Omit<UserProfile, "uid">),
        };
      } else {
        await setDoc(doc(db, "users", cred.user.uid), {
          ...profile,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      console.warn("Lưu ý: Chưa thể đồng bộ Firestore users (hãy kiểm tra Firestore Rules):", err?.message);
    }

    setUserProfile(profile);
    return profile;
  };

  const register = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole
  ): Promise<UserProfile> => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lms_demo_user");
    }
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      name: name.trim() || email.split("@")[0],
      email,
      role,
      classIds: [],
    };

    try {
      await setDoc(doc(db, "users", cred.user.uid), {
        ...newProfile,
        createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.warn("Lưu ý: Chưa thể ghi Firestore users (hãy cập nhật Firestore Rules):", err?.message);
    }

    setUserProfile(newProfile);
    return newProfile;
  };

  const loginWithGoogle = async (chosenRole: UserRole = "student"): Promise<UserProfile> => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lms_demo_user");
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;

    let profile: UserProfile = {
      uid: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "Người dùng Google",
      email: user.email || "",
      role: chosenRole,
      classIds: [],
    };

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        profile = {
          uid: user.uid,
          ...(userDoc.data() as Omit<UserProfile, "uid">),
        };
      } else {
        await setDoc(userDocRef, {
          ...profile,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      console.warn("Lưu ý: Chưa thể đọc/ghi Firestore users (hãy cập nhật Firestore Rules):", err?.message);
    }

    setUserProfile(profile);
    return profile;
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lms_demo_user");
    }
    setUserProfile(null);
    setCurrentUser(null);
    try {
      await signOut(auth);
    } catch {}
  };

  const loginDemo = (role: UserRole) => {
    const demoUser = role === "teacher" ? DEMO_TEACHER : DEMO_STUDENT;
    if (typeof window !== "undefined") {
      localStorage.setItem("lms_demo_user", JSON.stringify(demoUser));
    }
    setUserProfile(demoUser);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role: userProfile?.role || null,
        loading,
        login,
        register,
        loginWithGoogle,
        resetPassword,
        logout,
        loginDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
