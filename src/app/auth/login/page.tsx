'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setIsLoading(false)
        return
      }

      if (data.session) {
        // Honor redirect parameter from middleware (set when unauthenticated users hit protected routes)
        const params = new URLSearchParams(window.location.search)
        const redirect = params.get('redirect')

        if (redirect) {
          router.push(redirect)
        } else {
          // Fetch profile to route client users to portal
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .single()

          router.push(profile?.role === 'client' ? '/portal' : '/dashboard')
        }
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="mb-12 flex justify-center">
          <Image
            src="/images/resonate-logo-white.png"
            alt="RESONATE"
            width={200}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>

        <div className="glass rounded-2xl p-8">
          <h1 className="text-2xl font-display text-white mb-2 text-center">Welcome back</h1>
          <p className="text-obsidian-400 mb-8 text-center">Sign in to your account to continue.</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="w-5 h-5" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              leftIcon={<Lock className="w-5 h-5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-obsidian-500 hover:text-obsidian-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-obsidian-600 bg-obsidian-900 text-ember-500 focus:ring-ember-500/50"
                />
                <span className="text-sm text-obsidian-400">Remember me</span>
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-ember-400 hover:text-ember-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-obsidian-400">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-ember-400 hover:text-ember-300 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
