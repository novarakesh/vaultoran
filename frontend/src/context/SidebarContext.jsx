import React, { createContext, useContext, useState, useEffect } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  // Default to false: only icons will appear until user clicks hamburger
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('vaultoran_sidebar_expanded');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('vaultoran_sidebar_expanded', String(isSidebarExpanded));
    } catch (e) {
      console.warn('Failed to save sidebar preference:', e);
    }
  }, [isSidebarExpanded]);

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => !prev);
  };

  return (
    <SidebarContext.Provider
      value={{
        isSidebarExpanded,
        setIsSidebarExpanded,
        toggleSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export default SidebarContext;
