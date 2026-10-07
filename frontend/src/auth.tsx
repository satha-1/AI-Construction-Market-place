import { createContext, useContext } from "react";
import type { User } from "./api";

export const AuthContext = createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
  ready: boolean;
}>({ user: null, setUser: () => undefined, ready: false });

export function useAuth() {
  return useContext(AuthContext);
}
