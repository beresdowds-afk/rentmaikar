import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserType = "driver" | "owner" | null;

interface UserTypeContextType {
  userType: UserType;
  setUserType: (type: UserType) => void;
  isDriver: boolean;
  isOwner: boolean;
  hasSelectedType: boolean;
}

const UserTypeContext = createContext<UserTypeContextType | undefined>(undefined);

export const UserTypeProvider = ({ children }: { children: ReactNode }) => {
  const [userType, setUserType] = useState<UserType>(() => {
    const saved = localStorage.getItem("user-type");
    if (saved === "driver" || saved === "owner") return saved;
    return null;
  });

  useEffect(() => {
    if (userType) {
      localStorage.setItem("user-type", userType);
    } else {
      localStorage.removeItem("user-type");
    }
  }, [userType]);

  return (
    <UserTypeContext.Provider
      value={{
        userType,
        setUserType,
        isDriver: userType === "driver",
        isOwner: userType === "owner",
        hasSelectedType: userType !== null,
      }}
    >
      {children}
    </UserTypeContext.Provider>
  );
};

export const useUserType = () => {
  const context = useContext(UserTypeContext);
  if (!context) {
    throw new Error("useUserType must be used within a UserTypeProvider");
  }
  return context;
};
