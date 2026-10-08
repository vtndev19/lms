import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
  refreshUserProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (uid: string, fallbackUser?: FirebaseUser | null): Promise<UserProfile> => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as Omit<UserProfile, "uid">;
        const profile: UserProfile = {
          uid,
          ...data,
          classIds: Array.isArray(data.classIds) ? data.classIds : [],
        };
        setUserProfile(profile);
        return profile;
      }
    } catch (err) {
      console.warn("Lỗi đọc Firestore users:", err);
    }

    // Nếu document chưa tồn tại, tạo mặc định
    const fallback: UserProfile = {
      uid,
      name: fallbackUser?.displayName || fallbackUser?.email?.split("@")[0] || "Người dùng",
      email: fallbackUser?.email || "",
      role: "student",
      classIds: [],
    };

    try {
      await setDoc(doc(db, "users", uid), {
        ...fallback,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Lỗi khởi tạo Firestore users:", err);
    }

    setUserProfile(fallback);
    return fallback;
  }, []);

  const refreshUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!auth.currentUser) return null;
    return await fetchProfile(auth.currentUser.uid, auth.currentUser);
  }, [fetchProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user.uid, user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchProfile]);

  const login = async (email: string, pass: string): Promise<UserProfile> => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const profile = await fetchProfile(cred.user.uid, cred.user);
    return profile;
  };

  const register = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole
  ): Promise<UserProfile> => {
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
      console.warn("Lỗi ghi Firestore users khi đăng ký:", err?.message);
    }

    setUserProfile(newProfile);
    return newProfile;
  };

  const loginWithGoogle = async (chosenRole: UserRole = "student"): Promise<UserProfile> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data() as Omit<UserProfile, "uid">;
        const profile: UserProfile = {
          uid: user.uid,
          ...data,
          classIds: Array.isArray(data.classIds) ? data.classIds : [],
        };
        setUserProfile(profile);
        return profile;
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          name: user.displayName || user.email?.split("@")[0] || "Người dùng Google",
          email: user.email || "",
          role: chosenRole,
          classIds: [],
        };
        await setDoc(userDocRef, {
          ...newProfile,
          createdAt: serverTimestamp(),
        });
        setUserProfile(newProfile);
        return newProfile;
      }
    } catch (err: any) {
      console.warn("Lỗi đọc/ghi Firestore users Google login:", err?.message);
      const fallback: UserProfile = {
        uid: user.uid,
        name: user.displayName || "Người dùng Google",
        email: user.email || "",
        role: chosenRole,
        classIds: [],
      };
      setUserProfile(fallback);
      return fallback;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    setUserProfile(null);
    setCurrentUser(null);
    try {
      await signOut(auth);
    } catch {}
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
        refreshUserProfile,
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
