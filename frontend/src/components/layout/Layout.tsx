import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SOSButton from "./SOSButton";
import { Menu, X } from "lucide-react";

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-asphalt-900 transition-colors duration-300">
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between bg-white dark:bg-asphalt-800 px-4 py-3 border-b border-slate-200 dark:border-asphalt-700 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-signal text-xl font-bold">●</span>
          <span className="font-display font-bold text-lg dark:text-white">RoadSafety AI</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-asphalt-700 text-slate-600 dark:text-slate-300"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Navbar />
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex w-64 max-w-xs flex-1 flex-col bg-white dark:bg-asphalt-800 p-4 border-r border-slate-200 dark:border-asphalt-700 animate-slide-in">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-asphalt-700 text-slate-600 dark:text-slate-300"
              >
                <X size={20} />
              </button>
            </div>
            <div onClick={() => setMobileMenuOpen(false)} className="h-full flex flex-col">
              <Navbar />
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <Outlet />
        </main>
        <Footer />
      </div>
      <SOSButton />
    </div>
  );
}
