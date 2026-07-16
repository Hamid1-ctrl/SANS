import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ClassWorkspace } from '../types';
import api from '../lib/axios';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  classes: ClassWorkspace[];
  activeClass: ClassWorkspace | null; // null means "All Classes"
  setActiveClass: (cls: ClassWorkspace | null) => void;
  isLoading: boolean;
  refreshClasses: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [classes, setClasses] = useState<ClassWorkspace[]>([]);
  const [activeClass, setActiveClassState] = useState<ClassWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshClasses = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const response = await api.get<ClassWorkspace[]>('/classworkspaces');
      setClasses(response.data);
      // Auto-set active class if it was previously set, else keep it
      if (activeClass) {
        const found = response.data.find(c => c.id === activeClass.id);
        if (found) {
          setActiveClassState(found);
        } else {
          setActiveClassState(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch class workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshClasses();
    } else {
      setClasses([]);
      setActiveClassState(null);
    }
  }, [isAuthenticated]);

  const setActiveClass = (cls: ClassWorkspace | null) => {
    setActiveClassState(cls);
  };

  return (
    <WorkspaceContext.Provider value={{ classes, activeClass, setActiveClass, isLoading, refreshClasses }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
