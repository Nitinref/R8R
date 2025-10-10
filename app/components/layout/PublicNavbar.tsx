'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';

export function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="flex items-center gap-6">
      {/* Desktop Menu */}
      <div className="hidden md:flex items-center gap-6">
        <Link
          href="/features"
          className="text-white/70 hover:text-white transition-colors duration-200 font-medium"
        >
          Features
        </Link>
        <Link
          href="/pricing"
          className="text-white/70 hover:text-white transition-colors duration-200 font-medium"
        >
          Pricing
        </Link>
        <Link
          href="/docs"
          className="text-white/70 hover:text-white transition-colors duration-200 font-medium"
        >
          Docs
        </Link>
        <Link
          href="/login"
          className="text-white/70 hover:text-white transition-colors duration-200 font-medium"
        >
          Sign In
        </Link>
        <Link
          href="/signup"
          className="bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] text-white px-4 py-2 rounded-full font-medium hover:shadow-lg hover:shadow-[var(--brand-red-1)]/30 transition-all duration-300 hover:scale-105"
        >
          Get Started
        </Link>
      </div>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden text-white/70 hover:text-white transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="absolute top-20 left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/10 md:hidden">
          <div className="flex flex-col p-6 space-y-4">
            <Link
              href="/features"
              className="text-white/70 hover:text-white transition-colors duration-200 font-medium py-2"
              onClick={() => setIsOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-white/70 hover:text-white transition-colors duration-200 font-medium py-2"
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="text-white/70 hover:text-white transition-colors duration-200 font-medium py-2"
              onClick={() => setIsOpen(false)}
            >
              Documentation
            </Link>
            <div className="border-t border-white/10 pt-4 flex flex-col space-y-3">
              <Link
                href="/login"
                className="text-white/70 hover:text-white transition-colors duration-200 font-medium py-2"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] text-white px-4 py-3 rounded-xl font-medium text-center hover:shadow-lg hover:shadow-[var(--brand-red-1)]/30 transition-all duration-300"
                onClick={() => setIsOpen(false)}
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}