import React, { createContext, useContext, useState } from 'react';

type Role = 'owner' | 'delivery_boy';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: Role | null;
  currentUser: any | null;
  currentShop: any | null;
  login: (role: Role, user?: any, shop?: any) => void;
  logout: () => void;
  updateShop: (shopData: any) => void;
  updateUser: (userData: any) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: null,
  currentUser: null,
  currentShop: null,
  login: () => {},
  logout: () => {},
  updateShop: () => {},
  updateUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [currentShop, setCurrentShop] = useState<any | null>(null);

  const login = (selectedRole: Role, user?: any, shop?: any) => {
    setUserRole(selectedRole);
    if (user) setCurrentUser(user);
    if (shop) setCurrentShop(shop);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUser(null);
    setCurrentShop(null);
  };

  const updateShop = (shopData: any) => {
    setCurrentShop((prev: any) => ({ ...prev, ...shopData }));
  };

  const updateUser = (userData: any) => {
    setCurrentUser((prev: any) => ({ ...prev, ...userData }));
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        currentUser,
        currentShop,
        login,
        logout,
        updateShop,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
