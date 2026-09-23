import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { useI18n } from "../i18n";
import { LanguageSwitcher } from "../components/atoms/LanguageSwitcher";
import { ClubLogo } from "../components/atoms/ClubLogo";
import { LogoUploadModal } from "../components/molecules/LogoUploadModal";

interface PublicSession {
  id: string;
  type: string;
  period_name?: string | null;
  venue_name?: string | null;
  venue_description?: string | null;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  court_cost: number;
  shuttlecock_price: number;
  status: string;
}

export function LandingPage() {
  const { t, isId } = useI18n();
  const token = useSelector((s: RootState) => s.auth.token);
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Scroll position for transparent-to-solid navbar transition
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 30);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Parallax mouse position
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePos({ x, y });
    }

    const heroEl = heroRef.current;
    if (heroEl) {
      heroEl.addEventListener("mousemove", handleMouseMove);
    }
    return () => {
      if (heroEl) heroEl.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Fetch upcoming sessions from public endpoint
  useEffect(() => {
    let mounted = true;
    async function fetchSchedule() {
      try {
        const res = await fetch("/api/v1/public/schedule");
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data.data)) {
            setSessions(data.data.slice(0, 6));
          }
        }
      } catch (err) {
        console.warn("Could not fetch public schedule:", err);
      } finally {
        if (mounted) setLoadingSessions(false);
      }
    }
    fetchSchedule();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f9f5] text-ink selection:bg-lime/40 selection:text-pine-deep font-sans">
      {/* 1. TOP NAVBAR (Transparent over hero, subtle frosted glass on scroll) */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md border-b border-pine/10 shadow-sm py-0"
            : "bg-transparent border-transparent py-1 sm:py-2"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Logo & Brand (prevents multi-line wrapping on mobile) */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <ClubLogo
              size="md"
              editable
              onEdit={() => setLogoModalOpen(true)}
              className="cursor-pointer transition-transform hover:scale-105 shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-black tracking-tight text-[#0c2f21] whitespace-nowrap">
                PB <span className="text-emerald-700">KECEBONG</span>
              </span>
              <span className="hidden sm:block text-[10px] font-bold tracking-wider text-[#194532]/90 uppercase whitespace-nowrap">
                Badminton Club
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-6 lg:gap-7 md:flex text-sm font-bold text-[#0c2f21]">
            <a
              href="#hero"
              className="hover:text-emerald-700 transition-colors"
            >
              {t("landing.navHome")}
            </a>
            <a
              href="#tentang"
              className="hover:text-emerald-700 transition-colors"
            >
              {t("landing.navAbout")}
            </a>
            <a
              href="#jadwal"
              className="hover:text-emerald-700 transition-colors"
            >
              {t("landing.navSchedule")}
            </a>
            <a
              href="#member"
              className="hover:text-emerald-700 transition-colors"
            >
              {t("landing.navMember")}
            </a>
            <a
              href="#keuangan"
              className="hover:text-emerald-700 transition-colors"
            >
              {t("landing.navFinance")}
            </a>
          </nav>

          {/* Right Action: Language Switcher (Desktop) & Login / Dashboard Button & Mobile Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Language Switcher */}
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

            {token ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-[#0c2f21] hover:bg-[#164332] px-3.5 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg transition-all whitespace-nowrap"
              >
                <span>{t("landing.navDashboard")}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-[#0c2f21] hover:bg-[#164332] px-3.5 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg transition-all whitespace-nowrap"
              >
                <span>{t("landing.navLogin")}</span>
                <span className="text-lime text-xs sm:text-base font-bold">
                  →
                </span>
              </Link>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-[#0c2f21] hover:bg-black/5 md:hidden transition-colors shrink-0"
              aria-label="Toggle navigation menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                {mobileMenuOpen ? (
                  <path d="M18 6 6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-line bg-white/95 backdrop-blur-md px-5 py-4 md:hidden animate-in fade-in slide-in-from-top-2 shadow-lg">
            <nav className="flex flex-col space-y-3 text-sm font-semibold text-ink-soft">
              <a
                href="#hero"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-pine"
              >
                {t("landing.navHome")}
              </a>
              <a
                href="#tentang"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-pine"
              >
                {t("landing.navAbout")}
              </a>
              <a
                href="#jadwal"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-pine"
              >
                {t("landing.navSchedule")}
              </a>
              <a
                href="#member"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-pine"
              >
                {t("landing.navMember")}
              </a>
              <a
                href="#keuangan"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-pine"
              >
                {t("landing.navFinance")}
              </a>

              {/* Mobile Language Switcher Row */}
              <div className="pt-2 border-t border-line flex items-center justify-between">
                <span className="text-xs font-bold text-[#0c2f21]">
                  {isId ? "Pilih Bahasa" : "Language"}
                </span>
                <LanguageSwitcher />
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLogoModalOpen(true);
                }}
                className="text-left text-xs text-pine font-bold pt-2 border-t border-line flex items-center gap-1.5"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>
                  {isId ? "Kustomisasi Logo Klub" : "Customize Club Logo"}
                </span>
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION WITH USER'S BACKGROUND ARTWORK & PARALLAX */}
      <section
        id="hero"
        ref={heroRef}
        className="relative overflow-hidden min-h-[600px] lg:min-h-[720px] flex flex-col justify-between pt-20 sm:pt-24 lg:pt-28 pb-8 sm:pb-12 bg-gradient-to-b from-[#e3f4ea] via-[#d6eee0] to-[#c7e5d3]"
      >
        {/* DESKTOP BACKGROUND ARTWORK WITH PARALLAX (high-res 2K WebP, smooth natural scaling without over-zoom) */}
        <div
          className="hidden lg:block absolute inset-0 pointer-events-none transition-transform duration-300 ease-out"
          style={{
            backgroundImage: "url('/landing-hero-bg.webp?v=2')",
            backgroundSize: "cover",
            backgroundPosition: "center right",
            transform: `translate3d(${mousePos.x * -10}px, ${mousePos.y * -10}px, 0) scale(1.01)`,
          }}
        />

        {/* -------------------- A. DESKTOP HERO CONTENT (lg:block) -------------------- */}
        <div className="hidden lg:block relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 my-auto">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            {/* Left Column: Direct Typography on Background (NO white card!) */}
            <div
              className="lg:col-span-6 z-10 transition-transform duration-200 ease-out space-y-4"
              style={{
                transform: `translate3d(${mousePos.x * 10}px, ${mousePos.y * 10}px, 0)`,
              }}
            >
              {/* Badge */}
              <div className="text-xs font-black uppercase tracking-[0.2em] text-[#143728]">
                BADMINTON CLUB MANAGEMENT
              </div>

              {/* Main Display Headline */}
              <h1 className="text-6xl lg:text-7xl font-black tracking-tight text-[#0c2f21] leading-none drop-shadow-xs">
                PB KECEBONG
              </h1>

              {/* Sub-headline */}
              <p className="text-3xl lg:text-4xl font-black tracking-tight text-[#0c2f21]">
                {isId ? (
                  <>
                    Mabar Rutin,{" "}
                    <span className="text-emerald-700">Solid Terus!</span>
                  </>
                ) : (
                  <>
                    Play Together,{" "}
                    <span className="text-emerald-700">Stay Solid!</span>
                  </>
                )}
              </p>

              {/* Description */}
              <p className="text-sm md:text-base text-[#194532] font-semibold leading-relaxed max-w-lg">
                {t("landing.heroDesc")}
              </p>

              {/* CTA Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <a
                  href="#jadwal"
                  className="inline-flex items-center gap-2 rounded-full bg-[#0c2f21] hover:bg-[#164332] px-8 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
                >
                  <span>{t("landing.btnStart")}</span>
                  <span className="text-lime text-base font-bold">→</span>
                </a>
                <a
                  href="#tentang"
                  className="inline-flex items-center justify-center rounded-full border-2 border-[#0c2f21]/70 hover:border-[#0c2f21] hover:bg-[#0c2f21]/10 bg-transparent px-7 py-3 text-sm font-bold text-[#0c2f21] transition-all"
                >
                  {t("landing.btnFeatures")}
                </a>
              </div>

              {/* Quote */}
              <div className="pt-2 text-sm font-semibold italic text-[#194532]/85">
                "PB Kecebong — More Than Just a Game"
              </div>
            </div>

            {/* Right Column: Kept open so the background frog mascot artwork is 100% visible! */}
            <div className="lg:col-span-6 min-h-[360px]" />
          </div>
        </div>

        {/* -------------------- B. MOBILE & TABLET HERO CONTENT (lg:hidden) -------------------- */}
        <div className="block lg:hidden relative z-10 mx-auto w-full max-w-xl px-4 sm:px-6 pt-2 pb-4 space-y-4">
          {/* Header Typography */}
          <div className="text-center space-y-1.5">
            <div className="inline-block text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#143728] bg-white/40 px-3 py-1 rounded-full border border-white/60">
              BADMINTON CLUB MANAGEMENT
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#0c2f21] leading-none">
              PB KECEBONG
            </h1>
            <p className="text-xl sm:text-2xl font-black tracking-tight text-[#0c2f21]">
              {isId ? (
                <>
                  Mabar Rutin,{" "}
                  <span className="text-emerald-700">Solid Terus!</span>
                </>
              ) : (
                <>
                  Play Together,{" "}
                  <span className="text-emerald-700">Stay Solid!</span>
                </>
              )}
            </p>
          </div>

          {/* Dedicated Visual Showcase Card (Frog mascot is 100% visible, not covered by text!) */}
          <div className="relative mx-auto w-full aspect-[16/10] rounded-2xl overflow-hidden shadow-xl border-2 border-white/80 group">
            <img
              src="/landing-hero-bg.webp?v=2"
              alt="PB Kecebong Mascot Artwork"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-bold">
              <span className="bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/30">
                🏸 PB Kecebong Club
              </span>
              <span className="text-lime text-xs font-extrabold drop-shadow">
                #SolidTerus
              </span>
            </div>
          </div>

          {/* Description & Action Buttons below the Mascot */}
          <div className="text-center space-y-3 pt-1">
            <p className="text-xs sm:text-sm text-[#194532] font-semibold leading-relaxed max-w-md mx-auto">
              {t("landing.heroDesc")}
            </p>

            <div className="flex items-center justify-center gap-3">
              <a
                href="#jadwal"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0c2f21] hover:bg-[#164332] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
              >
                <span>{t("landing.btnStart")}</span>
                <span className="text-lime text-sm font-bold">→</span>
              </a>
              <a
                href="#tentang"
                className="inline-flex items-center justify-center rounded-full border-2 border-[#0c2f21]/70 hover:border-[#0c2f21] hover:bg-[#0c2f21]/10 bg-white/40 px-5 py-2.5 text-xs sm:text-sm font-bold text-[#0c2f21] transition-all"
              >
                {t("landing.btnFeatures")}
              </a>
            </div>

            <div className="text-xs font-semibold italic text-[#194532]/85">
              "PB Kecebong — More Than Just a Game"
            </div>
          </div>
        </div>

        {/* -------------------- C. BOTTOM 4 FEATURE PILLS + SCROLL INDICATOR -------------------- */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 mt-2 sm:mt-6 lg:mt-10">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:gap-4 max-w-5xl mx-auto">
            <a
              href="#member"
              className="group flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-white/50 backdrop-blur-md p-2.5 sm:p-3.5 border border-white/70 shadow-xs sm:shadow-md hover:bg-white/80 hover:shadow-lg transition-all"
            >
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-[#0c2f21] text-lime group-hover:bg-[#164332] transition-colors shadow-xs">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                </svg>
              </div>
              <span className="text-xs sm:text-sm font-black text-[#0c2f21] leading-tight">
                {t("landing.pillMembers")}
              </span>
            </a>

            <a
              href="#jadwal"
              className="group flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-white/50 backdrop-blur-md p-2.5 sm:p-3.5 border border-white/70 shadow-xs sm:shadow-md hover:bg-white/80 hover:shadow-lg transition-all"
            >
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-[#0c2f21] text-lime group-hover:bg-[#164332] transition-colors shadow-xs">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <span className="text-xs sm:text-sm font-black text-[#0c2f21] leading-tight">
                {t("landing.pillSchedule")}
              </span>
            </a>

            <a
              href="#tentang"
              className="group flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-white/50 backdrop-blur-md p-2.5 sm:p-3.5 border border-white/70 shadow-xs sm:shadow-md hover:bg-white/80 hover:shadow-lg transition-all"
            >
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-[#0c2f21] text-lime group-hover:bg-[#164332] transition-colors shadow-xs">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                >
                  <path d="M12 3 4 6.8v10.4L12 21l8-3.8V6.8L12 3Z" />
                </svg>
              </div>
              <span className="text-xs sm:text-sm font-black text-[#0c2f21] leading-tight">
                {t("landing.pillShuttle")}
              </span>
            </a>

            <a
              href="#keuangan"
              className="group flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-white/50 backdrop-blur-md p-2.5 sm:p-3.5 border border-white/70 shadow-xs sm:shadow-md hover:bg-white/80 hover:shadow-lg transition-all"
            >
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-[#0c2f21] text-lime group-hover:bg-[#164332] transition-colors shadow-xs">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                >
                  <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
              </div>
              <span className="text-xs sm:text-sm font-black text-[#0c2f21] leading-tight">
                {t("landing.pillFinance")}
              </span>
            </a>
          </div>

          {/* Centered Scroll Indicator */}
          <div className="mt-5 sm:mt-8 flex flex-col items-center justify-center text-[#0c2f21]/80">
            <div className="h-5 w-3.5 rounded-full border-2 border-[#0c2f21]/60 flex items-start justify-center p-0.5 mb-1">
              <div className="h-1 w-1 rounded-full bg-[#0c2f21] animate-bounce" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">
              {t("landing.scrollExplore")}
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="mt-0.5 h-3.5 w-3.5 animate-pulse"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </section>

      {/* 3. TENTANG SECTION */}
      <section id="tentang" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
              {isId ? "Filosofi Klub" : "Club Philosophy"}
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-pine">
              {t("landing.aboutTitle")}
            </h2>
            <p className="mt-3 text-base sm:text-lg text-ink-soft">
              {t("landing.aboutSubtitle")}
            </p>
          </div>

          {/* 3 Pillars Grid */}
          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Pillar 1 */}
            <div className="rounded-2xl border border-line bg-court/30 p-7 shadow-xs hover:border-lime hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-pine text-white shadow-md">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="mt-5 text-lg font-bold text-pine">
                {t("landing.pillar1Title")}
              </h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                {t("landing.pillar1Desc")}
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-2xl border border-line bg-court/30 p-7 shadow-xs hover:border-lime hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-pine text-white shadow-md">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <h3 className="mt-5 text-lg font-bold text-pine">
                {t("landing.pillar2Title")}
              </h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                {t("landing.pillar2Desc")}
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-2xl border border-line bg-court/30 p-7 shadow-xs hover:border-lime hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-lime to-emerald-600 text-pine-deep shadow-md font-bold">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3v18M3 12h18" />
                </svg>
              </div>
              <h3 className="mt-5 text-lg font-bold text-pine">
                {t("landing.pillar3Title")}
              </h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                {t("landing.pillar3Desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. JADWAL MABAR SECTION */}
      <section id="jadwal" className="py-20 bg-court/40 border-y border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
            <div>
              <span className="rounded-full bg-emerald-200/70 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-900">
                {isId ? "Jadwal Terbuka" : "Public Schedule"}
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-pine">
                {t("landing.scheduleTitle")}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {t("landing.scheduleSubtitle")}
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-3">
              <Link
                to="/live"
                className="inline-flex items-center gap-2 rounded-xl bg-white border border-line px-4 py-2.5 text-xs font-bold text-pine shadow-xs hover:bg-court hover:border-lime transition-all"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t("landing.scheduleLiveScore")}</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Schedule Cards Grid */}
          {loadingSessions ? (
            <div className="py-12 text-center text-sm text-ink-soft">
              {isId ? "Memuat jadwal sesi mabar..." : "Loading sessions..."}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-court text-pine">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-7 w-7"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-semibold text-ink">
                {t("landing.scheduleEmpty")}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {isId
                  ? "Jadwal rutin: Setiap Rabu malam & Minggu pagi di GOR PB Kecebong."
                  : "Regular schedule: Wednesday evenings & Sunday mornings."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-xs hover:border-lime hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                        {sess.type === "PERIOD"
                          ? (sess.period_name ?? "Member Period")
                          : "Open Play / Tamu"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                          sess.status === "COMPLETED"
                            ? "bg-neutral-100 text-neutral-600"
                            : "bg-emerald-500 text-white"
                        }`}
                      >
                        {sess.status}
                      </span>
                    </div>

                    <h4 className="mt-4 text-lg font-bold text-pine">
                      {sess.date}
                    </h4>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {sess.start_time && sess.end_time
                        ? `${sess.start_time} - ${sess.end_time} WIB`
                        : "Waktu mabar rutin"}
                    </p>

                    <div className="mt-4 flex items-start gap-2 text-xs text-ink">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="mt-0.5 h-4 w-4 shrink-0 text-pine"
                      >
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="font-medium">
                        {sess.venue_name ||
                          sess.venue_description ||
                          "GOR Badminton PB Kecebong"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-line pt-3 text-xs">
                    <span className="text-ink-soft">Biaya Kok / Match:</span>
                    <span className="font-bold text-pine">
                      Rp {sess.shuttlecock_price.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. MEMBER & KOMUNITAS SECTION */}
      <section id="member" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-[#143728] via-[#1a4434] to-[#102a1f] p-8 sm:p-14 text-paper shadow-xl">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <span className="rounded-full bg-lime/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-lime border border-lime/30">
                  {isId ? "Komunitas Solid" : "Strong Community"}
                </span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-white">
                  {t("landing.memberTitle")}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-paper/80 leading-relaxed">
                  {t("landing.memberSubtitle")}
                </p>
                <p className="mt-2 text-xs sm:text-sm text-paper/60">
                  {t("landing.memberDesc")}
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                    <p className="text-2xl font-black text-lime">50+</p>
                    <p className="text-xs text-paper/70 font-medium">
                      Member Aktif
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                    <p className="text-2xl font-black text-lime">95%</p>
                    <p className="text-xs text-paper/70 font-medium">
                      Tingkat Kehadiran
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                    <p className="text-2xl font-black text-lime">4 Level</p>
                    <p className="text-xs text-paper/70 font-medium">
                      Grade Roster (A/B/C/D)
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <ClubLogo size="xl" className="mb-4" />
                <h4 className="text-lg font-bold text-white">PB KECEBONG</h4>
                <p className="text-xs text-lime font-bold mt-1">
                  "PLAY, IMPROVE, FRIENDSHIP, HEALTHY LIFE"
                </p>
                <p className="text-xs text-paper/60 mt-3 max-w-xs">
                  {isId
                    ? "Tertarik mabar bareng atau gabung roster? Hubungi koordinator lapangan atau pantau jadwal kami."
                    : "Interested in playing together? Contact the match coordinator or follow our schedule."}
                </p>
                {token ? (
                  <Link
                    to="/players"
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2 text-xs font-extrabold text-pine-deep shadow-md hover:bg-emerald-300 transition-colors"
                  >
                    <span>
                      {isId ? "Buka Daftar Member" : "View Member Roster"}
                    </span>
                    <span>→</span>
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2 text-xs font-extrabold text-pine-deep shadow-md hover:bg-emerald-300 transition-colors"
                  >
                    <span>
                      {isId ? "Masuk ke Sistem" : "Sign In to Portal"}
                    </span>
                    <span>→</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. KEUANGAN & TRANSPARANSI SECTION */}
      <section id="keuangan" className="py-20 bg-court/30 border-t border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
              {isId ? "Keuangan Terbuka" : "Transparent Treasury"}
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-pine">
              {t("landing.financeTitle")}
            </h2>
            <p className="mt-3 text-base text-ink-soft">
              {t("landing.financeSubtitle")}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                1
              </div>
              <h4 className="mt-4 text-base font-bold text-pine">
                {isId ? "Sewa Lapangan Terbagi Rata" : "Court Rental Split"}
              </h4>
              <p className="mt-2 text-xs text-ink-soft leading-relaxed">
                {isId
                  ? "Biaya lapangan dibayar secara kolektif per periode atau per pertemuan, tanpa mark-up sepihak."
                  : "Court fees are shared fairly per session with zero hidden margins."}
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                2
              </div>
              <h4 className="mt-4 text-base font-bold text-pine">
                {isId ? "Pencatatan Kok Presisi" : "Exact Shuttle Tracking"}
              </h4>
              <p className="mt-2 text-xs text-ink-soft leading-relaxed">
                {isId
                  ? "Setiap tabung dan butir kok yang terpakai di lapangan diinput secara real-time pada papan pertandingan."
                  : "Every shuttlecock opened is tracked live during the matches."}
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                3
              </div>
              <h4 className="mt-4 text-base font-bold text-pine">
                {isId ? "Laporan Kas Digital" : "Digital Cash Reports"}
              </h4>
              <p className="mt-2 text-xs text-ink-soft leading-relaxed">
                {isId
                  ? "Kas masuk dan kas keluar dapat diekspor langsung dalam format spreadsheet CSV atau tabel visual."
                  : "All inflows and outflows are exportable to CSV spreadsheets anytime."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-pine/15 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <ClubLogo size="sm" />
              <div>
                <p className="text-sm font-extrabold text-pine">
                  PB KECEBONG BADMINTON CLUB
                </p>
                <p className="text-xs text-ink-soft italic">
                  "{t("landing.footerTagline")}"
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-ink-soft">
              <a href="#hero" className="hover:text-pine">
                {t("landing.navHome")}
              </a>
              <a href="#tentang" className="hover:text-pine">
                {t("landing.navAbout")}
              </a>
              <a href="#jadwal" className="hover:text-pine">
                {t("landing.navSchedule")}
              </a>
              <a href="#member" className="hover:text-pine">
                {t("landing.navMember")}
              </a>
              <a href="#keuangan" className="hover:text-pine">
                {t("landing.navFinance")}
              </a>
              <Link
                to="/live"
                className="text-emerald-700 hover:text-emerald-800 font-bold"
              >
                Live Board
              </Link>
              <Link to="/login" className="text-pine font-bold hover:underline">
                {t("landing.navLogin")}
              </Link>
            </div>
          </div>

          <div className="mt-8 border-t border-line pt-6 text-center text-xs text-ink-soft">
            <p>
              © {new Date().getFullYear()} PB Kecebong Badminton Club. All
              rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* 8. MODAL KUSTOM LOGO */}
      <LogoUploadModal
        open={logoModalOpen}
        onClose={() => setLogoModalOpen(false)}
      />
    </div>
  );
}
