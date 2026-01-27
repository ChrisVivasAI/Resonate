"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Instagram, Mail, ChevronDown, Menu, X } from "lucide-react"

export function Header() {
  const [servicesOpen, setServicesOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-8 py-6 bg-black/20 backdrop-blur-sm">
      <Link href="/">
        <Image
          src="/images/resonate-logo-white.png"
          alt="RESONATE"
          width={150}
          height={30}
          className="h-6 w-auto"
        />
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-8">
        <Link
          href="/#about"
          className="font-display text-sm tracking-widest text-white/90 hover:text-white transition-colors"
        >
          ABOUT
        </Link>

        {/* Services Dropdown */}
        <div
          className="relative"
          onMouseEnter={() => setServicesOpen(true)}
          onMouseLeave={() => setServicesOpen(false)}
        >
          <button
            className="flex items-center gap-1 font-display text-sm tracking-widest text-white/90 hover:text-white transition-colors"
          >
            SERVICES
            <ChevronDown className={`w-4 h-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
          </button>

          {servicesOpen && (
            <div className="absolute top-full left-0 pt-2 w-max">
              <div className="py-2 bg-neutral-900/95 backdrop-blur-sm rounded-lg min-w-[180px] shadow-xl">
                <Link
                  href="/services/artist-360"
                  className="block px-4 py-2 font-display text-sm tracking-wider text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Artist 360
                </Link>
                <Link
                  href="/services/brand-360"
                  className="block px-4 py-2 font-display text-sm tracking-wider text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Brand 360
                </Link>
                <Link
                  href="/services/event-360"
                  className="block px-4 py-2 font-display text-sm tracking-wider text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Event 360
                </Link>
              </div>
            </div>
          )}
        </div>

        <Link
          href="/#contact"
          className="font-display text-sm tracking-widest text-white/90 hover:text-white transition-colors"
        >
          CONTACT
        </Link>

        <Link
          href="/auth/login"
          className="font-display text-sm tracking-widest text-white/90 hover:text-white transition-colors border border-white/30 px-4 py-2 rounded hover:bg-white/10"
        >
          LOGIN
        </Link>
      </nav>

      <div className="hidden md:flex items-center gap-4">
        <Link
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/90 hover:text-white transition-colors"
          aria-label="Instagram"
        >
          <Instagram className="w-5 h-5" />
        </Link>
        <Link
          href="mailto:info@resonate-agency.com"
          className="text-white/90 hover:text-white transition-colors"
          aria-label="Email"
        >
          <Mail className="w-5 h-5" />
        </Link>
      </div>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden text-white"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-lg md:hidden">
          <nav className="flex flex-col p-6 gap-4">
            <Link
              href="/#about"
              className="font-display text-lg tracking-widest text-white/90 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              ABOUT
            </Link>
            <Link
              href="/services/artist-360"
              className="font-display text-lg tracking-widest text-white/90 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              ARTIST 360
            </Link>
            <Link
              href="/services/brand-360"
              className="font-display text-lg tracking-widest text-white/90 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              BRAND 360
            </Link>
            <Link
              href="/services/event-360"
              className="font-display text-lg tracking-widest text-white/90 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              EVENT 360
            </Link>
            <Link
              href="/#contact"
              className="font-display text-lg tracking-widest text-white/90 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              CONTACT
            </Link>
            <Link
              href="/auth/login"
              className="font-display text-lg tracking-widest text-white border border-white/30 px-4 py-2 rounded text-center hover:bg-white/10"
              onClick={() => setMobileMenuOpen(false)}
            >
              LOGIN
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
