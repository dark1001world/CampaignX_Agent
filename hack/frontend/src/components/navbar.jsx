import React from 'react';
import { ShieldCheck, Sun, Moon, Menu, X } from 'lucide-react';

const Navbar = ({ isDark, toggleTheme }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-md border-b px-8 py-4 transition-colors duration-300"
      style={{
        background: isDark ? 'rgba(2,6,23,0.85)' : 'rgba(248,250,252,0.85)',
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="p-2 bg-blue-600 rounded-lg group-hover:rotate-12 transition-transform duration-300">
            <ShieldCheck className="text-white" size={22} />
          </div>
          <span
            className="text-2xl font-black tracking-tighter"
            style={{ color: isDark ? '#fff' : '#0f172a' }}
          >
            AEGIS
          </span>
        </div>

        {/* Desktop Nav Links */}
        <div
          className="hidden md:flex gap-10 text-sm font-medium"
          style={{ color: isDark ? '#94a3b8' : '#475569' }}
        >
          {['Intelligence', 'Workflow', 'Network'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="hover:text-blue-500 transition-colors duration-200"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border transition-all duration-300 hover:scale-110"
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              color: isDark ? '#fbbf24' : '#6366f1',
            }}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* CTA Button */}
          <button className="hidden sm:block bg-blue-600 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30">
            Get Early Access
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ color: isDark ? '#94a3b8' : '#475569' }}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div
          className="md:hidden mt-4 pb-4 flex flex-col gap-4 text-sm font-medium border-t pt-4"
          style={{
            color: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
          }}
        >
          {['Intelligence', 'Workflow', 'Network'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="hover:text-blue-500 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </a>
          ))}
          <button className="w-full bg-blue-600 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-blue-500 transition-all">
            Get Early Access
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;