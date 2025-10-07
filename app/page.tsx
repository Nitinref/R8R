import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { CursorGlow } from "../components/cursor-glow"

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-(--brand-contrast)">
      {/* Base black background */}
      <div className="absolute inset-0 bg-(--brand-bg)" aria-hidden />
      {/* Centered circular red gradient */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[90vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-2xl"
        style={{
          background: "radial-gradient(circle at center, var(--brand-red-1), rgba(0,0,0,0) 60%)",
        }}
        aria-hidden
      />
      {/* Subtle diagonal wash */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-(--brand-red-1)/10 via-transparent to-(--brand-red-2)/10"
        aria-hidden
      />
      {/* Cursor-following glow overlay */}
      <CursorGlow size={900} opacity={0.12} hoverOnly className="" />
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Increase logo size for visibility */}
            <img src="/images/r8r-logo.png" alt="R8R logo" className="h-20 w-auto md:h-24" />
            <span className="font-semibold tracking-tight">R8R</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/editor" className="opacity-80 transition hover:opacity-100">
              Editor
            </Link>
            <Link href="/auth/sign-in" className="opacity-80 transition hover:opacity-100">
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-md bg-(--brand-red-1) px-3 py-2 text-(--brand-contrast) transition hover:bg-(--brand-red-2)"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10">
        {/* Widen container and give the video column more width */}
        <div className="mx-auto max-w-[88rem] px-6 py-16 md:py-24">
          <div className="text-center">
            <h1 className="text-balance text-4xl md:text-6xl font-semibold leading-tight tracking-tight">
              Build beautiful, production-ready
              <span className="block bg-gradient-to-r from-(--brand-red-1) to-(--brand-red-2) bg-clip-text text-transparent">
                Multi‑LLM RAG Workflows
              </span>
              without the friction
            </h1>
            <p className="mt-4 text-pretty leading-relaxed opacity-80">
              Orchestrate query rewrite, retrieval, rerank, and answer generation with a fluid, snap-to-grid editor.
              Visualize your pipeline—then iterate faster.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/editor"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-(--brand-red-1) px-5 py-3 text-(--brand-contrast) transition hover:bg-(--brand-red-2)"
              >
                Launch Editor <ArrowRight size={18} />
              </Link>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center justify-center rounded-md border border-white/10 px-5 py-3 transition hover:bg-white/5"
              >
                Create free account
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 text-sm opacity-80">
              <div className="rounded-md border border-white/10 p-4">Snap-to-grid, smooth edges</div>
              <div className="rounded-md border border-white/10 p-4">Fullscreen editing</div>
              <div className="rounded-md border border-white/10 p-4">Visual analytics</div>
              <div className="rounded-md border border-white/10 p-4">Zero-config start</div>
            </div>
          </div>

          {/* Move video below text and make it wider */}
          <div className="relative mt-12">
            <div
              className="absolute -inset-6 opacity-30 blur-2xl"
              style={{
                background: "radial-gradient(circle at 30% 30%, var(--brand-red-1), rgba(0,0,0,0) 60%)",
              }}
              aria-hidden
            />
            <div className="relative mx-auto aspect-video w-full max-w-3xl md:max-w-4xl overflow-hidden rounded-xl border border-white/10 bg-black/40 ring-1 ring-(--brand-red-1)/30">
              <video
                className="h-full w-full object-cover"
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/RAG_Workflow_API_Creation-zInmkL7O9vdvnTSkrUiQLtPpkFLSNN.mp4"
                autoPlay
                muted
                loop
                playsInline
                poster="/placeholder.jpg"
                aria-label="Demo: RAG Workflow API creation"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-semibold">Everything you need to build great RAG</h2>
            <p className="mt-2 opacity-80 leading-relaxed">
              A focused toolset for designing, inspecting, and iterating on multi‑LLM retrieval‑augmented generation.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/40 p-6">
              <h3 className="font-medium">Visual orchestration</h3>
              <p className="mt-2 text-sm opacity-80">
                Drag, drop, and snap nodes with smooth edges and a focused workspace.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-6">
              <h3 className="font-medium">Measure and iterate</h3>
              <p className="mt-2 text-sm opacity-80">
                Lightweight analytics to compare variants and keep quality moving up.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-6">
              <h3 className="font-medium">Fullscreen focus</h3>
              <p className="mt-2 text-sm opacity-80">
                Enter fullscreen to concentrate on complex graphs without distractions.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
          <div className="flex items-center gap-3">
            <img src="/images/r8r-logo.png" alt="R8R logo" className="h-10 w-auto" />
            <span className="font-semibold tracking-tight">R8R</span>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-4 text-sm opacity-80">
            <Link href="/editor" className="transition hover:opacity-100">
              Editor
            </Link>
            <Link href="/auth/sign-in" className="transition hover:opacity-100">
              Sign in
            </Link>
            <Link href="/auth/sign-up" className="text-(--brand-red-1) transition hover:text-(--brand-red-2)">
              Get started
            </Link>
          </nav>

          <p className="text-center text-xs opacity-70 md:text-right">
            © {new Date().getFullYear()} R8R. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}
