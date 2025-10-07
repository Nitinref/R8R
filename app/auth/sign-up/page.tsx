"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignUpPage() {
  const [loading, setLoading] = useState(false)

  return (
    <main className="relative grid min-h-screen place-items-center text-white">
      <div className="absolute inset-0 bg-black" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-2xl"
        style={{
          background: "radial-gradient(circle at center, var(--brand-red-1), rgba(0,0,0,0) 60%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-(--brand-red-1)/10 via-transparent to-(--brand-red-2)/10"
        aria-hidden
      />
      <Card className="w-full max-w-sm border-white/10 bg-black/40 backdrop-blur text-white">
        <CardHeader>
          <CardTitle className="text-center text-white">Create your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-white">
          <div className="space-y-2">
            <Label className="text-white" htmlFor="name">
              Name
            </Label>
            <Input id="name" placeholder="Jane Doe" className="text-white placeholder:text-white/60" />
          </div>
          <div className="space-y-2">
            <Label className="text-white" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="text-white placeholder:text-white/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white" htmlFor="password">
              Password
            </Label>
            <Input id="password" type="password" className="text-white placeholder:text-white/60" />
          </div>
          <Button
            className="w-full bg-(--brand-red-1) hover:bg-(--brand-red-2) text-white"
            disabled={loading}
            onClick={() => setLoading(true)}
          >
            {loading ? "Creating..." : "Create account"}
          </Button>
          <p className="text-center text-sm opacity-90 text-white">
            Already have an account?{" "}
            <Link className="underline hover:opacity-100 text-white" href="/auth/sign-in">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
