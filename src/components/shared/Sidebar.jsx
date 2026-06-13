"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  LayoutDashboard,
  Users,
  Truck,
  MapPin,
  Boxes,
  Wallet,
  Bell,
  Building2,
  FileText,
  ChevronDown,
  Menu,
  X,
  UtilityPole,
  LogOut,
  PanelRight,
  ShoppingCart
} from "lucide-react";
import LogoSVG from "@/components/svg/logoSVG";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useLogout } from "@/hooks/auth/useLogout";

const Sidebar = ({collapseSide, setCollapseSide}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [setupOpen, setSetupOpen] = useState(true);
  const [pagesOpen, setPagesOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const refreshToken = useSelector((state) => state.user?.refreshToken);
  const { mutateAsync: logoutUser, isPending: isLoggingOut } = useLogout({
    onSuccess: () => {
      router.push('/login');
    },
    onError: () => {
      router.push('/login');
    },
  });

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024); 
      
      if (width >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && sidebarOpen && isMobile) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [sidebarOpen, isMobile]);

  const MenuItem = ({ icon: Icon, label, href = "/dashboard/clients" }) => {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    if (href === "/setup/organization-setup") {
      localStorage.setItem("organizationSetupActiveTab","addOffice")
    }
    return (
      <Link
        href={href}
        onClick={() => isMobile && setSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200
          ${isActive
            ? "bg-customGreen text-white shadow-sm"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          }
        `}
      >
        <Icon className="w-5 h-5" />
        <span className="flex-1 font-medium">{label}</span>
      </Link>
    );
  };

  const getRefreshToken = () => {
    if (refreshToken) return refreshToken;
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('refreshToken');
      }
    } catch (error) {
      console.error('[Sidebar] Failed to read refreshToken from localStorage:', error);
    }
    return null;
  };

  const handleLogout = async () => {
    const token = getRefreshToken();
    try {
      if (token) {
        await logoutUser({ refreshToken: token });
      } else {
        await logoutUser({});
      }
    } finally {
      if (isMobile) {
        setSidebarOpen(false);
      }
    }
  };

  return (
    <>
      {/* Mobile Toggle Button - Only show below 1024px */}
      {isMobile && (
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden fixed top-2 sm:top-3 left-2 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen bg-white border-r border-gray-200 z-40
        ${isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'} 
        transition-all duration-300 ease-in-out
        ${collapseSide ? 'w-20' : 'w-64'}
      `}>
        {/* <button 
          onClick={()=> setCollapseSide(!collapseSide)}
          className={` cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors w-[90%] flex justify-center m-auto`}
          title={collapseSide ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelRight className={`${collapseSide ? 'rotate-180' : ''}`} />
        </button> */}

        {/* Hide everything when collapsed */}
        {!collapseSide && (
          <div className="flex flex-col h-full px-4 py-4 overflow-y-auto">
            {/* Logo aur close button mobile ke liye */}
            <div className="flex items-center justify-between mb-0 px-2 pb-6 border-b border-gray-200">
              <LogoSVG />
              {isMobile && (
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 md:hidden"
                  aria-label="Close sidebar"
                >
                </button>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-gray-200">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-100 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                {/* <div className="font-medium text-gray-800 text-sm">User Name</div> */}
                <div className="text-lg text-gray-500">Admin</div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1">
              {/* Dashboard Section */}
              <div className="mb-2">
                <button
                  onClick={() => setDashboardOpen(!dashboardOpen)}
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-5 h-5 text-gray-700" />
                    <span className="font-medium text-gray-700">Dashboards</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${dashboardOpen ? "rotate-180" : ""}`}
                  />
                </button>
                
                {dashboardOpen && (
                  <div className="mt-1 ml-8 space-y-1">
                    <MenuItem icon={Users} label="Clients" href="/dashboard/clients" />
                    <MenuItem icon={Truck} label="Vehicles" href="/dashboard/vehicles" />
                  </div>
                )}
              </div>

              {/* Pages Section */}
              <div className="mt-6">
                <button
                  onClick={() => setPagesOpen(!pagesOpen)}
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-700" />
                    <span className="font-medium text-gray-700">Pages</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${pagesOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {pagesOpen && (
                  <div className="mt-1 ml-8 space-y-1">
                    <MenuItem icon={ShoppingCart} label="Sales" href="/dashboard/sales" />
                    <MenuItem icon={MapPin} label="Geofence" href="/dashboard/geofence" />
                    <MenuItem icon={Boxes} label="Inventory" href="/dashboard/inventory" />
                    <MenuItem icon={Wallet} label="Finance & Accounts" href="/dashboard/finance" />
                    <MenuItem icon={UtilityPole} label="RoboCall" href="/dashboard/robocall" />
                    <MenuItem icon={Bell} label="Complaints" href="/dashboard/complaints" />
                  </div>
                )}
              </div>


              {/* Setup Section */}
              <div className="mt-6">
                <button
                  onClick={() => setSetupOpen(!setupOpen)}
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-700" />
                    <span className="font-medium text-gray-700">Setup</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${setupOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {setupOpen && (
                  <div className="mt-1 ml-8 space-y-1">
                    <MenuItem icon={Bell} label="Notifications" href="/dashboard/notifications" />
                    <MenuItem icon={Building2} label="Organization Setup" href="/setup/organization-setup" />
                    <MenuItem icon={FileText} label="Reports" href="/dashboard/reports" />
                  </div>
                )}
              </div>

            </nav>

            <div className="mt-auto pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 w-full
                  ${isLoggingOut
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }
                `}
              >
                <LogOut className="w-5 h-5" />
                <span className="flex-1 font-medium">Logout</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-gray-900/5 backdrop-blur-[2px] backdrop-saturate-150 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;