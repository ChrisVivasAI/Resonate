'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff, Building2, Mail, Shield } from 'lucide-react'

interface InvitationData {
  id: string
  email: string
  expires_at: string
  client: {
    id: string
    name: string
    company?: string
  } | null
}

export default function AcceptInvitationPage({
  params,
}: {
  params: { token: string }
}) {
  const router = useRouter()
  const [token, setToken] = useState<string>(params.token)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
  })

  // Validate token on mount
  useEffect(() => {
    if (!token) return

    async function validateToken() {
      try {
        const response = await fetch(`/api/invitations/${token}`)
        const data = await response.json()

        if (!response.ok || !data.valid) {
          setError(data.error || 'Invalid or expired invitation')
          setLoading(false)
          return
        }

        setInvitation(data.invitation)
        setLoading(false)
      } catch {
        setError('Failed to validate invitation')
        setLoading(false)
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password,
          fullName: formData.fullName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        setSubmitting(false)
        return
      }

      setSuccess(true)

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch {
      setError('Failed to create account')
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-[#23FD9E] animate-spin" />
          <p className="text-white/60 text-sm tracking-wide">Validating invitation...</p>
        </motion.div>
      </div>
    )
  }

  // Error state (invalid/expired token)
  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#2B2B2B]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">
              Invalid Invitation
            </h1>
            <p className="text-white/60 mb-6">{error}</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="text-[#23FD9E] hover:text-[#23FD9E]/80 text-sm font-medium transition-colors"
            >
              Go to Login
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#2B2B2B]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-16 h-16 bg-[#23FD9E]/10 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-8 h-8 text-[#23FD9E]" />
            </motion.div>
            <h1 className="text-2xl font-semibold text-white mb-2">
              Account Created!
            </h1>
            <p className="text-white/60 mb-4">
              Your account has been created successfully. Redirecting to login...
            </p>
            <Loader2 className="w-5 h-5 text-[#23FD9E] animate-spin mx-auto" />
          </div>
        </motion.div>
      </div>
    )
  }

  // Main form
  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      {/* Background gradient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -right-[20%] w-[60%] h-[60%] bg-[#23FD9E]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[30%] -left-[20%] w-[50%] h-[50%] bg-white/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-14 h-14 bg-gradient-to-br from-[#23FD9E] to-[#1ed189] rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#23FD9E]/20"
          >
            <span className="text-[#1a1a1a] font-bold text-xl">R</span>
          </motion.div>
          <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">
            Welcome to Resonate
          </h1>
          <p className="text-white/60">
            Complete your account setup to get started
          </p>
        </div>

        {/* Invitation details card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#2B2B2B]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#23FD9E]/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#23FD9E]" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white/40 uppercase tracking-wider mb-0.5">
                You&apos;re joining
              </p>
              <p className="text-white font-medium">
                {invitation?.client?.name}
                {invitation?.client?.company && (
                  <span className="text-white/60 font-normal">
                    {' '}at {invitation.client.company}
                  </span>
                )}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#2B2B2B]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="email"
                  value={invitation?.email || ''}
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pl-11 text-white/60 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                placeholder="Enter your full name"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/50 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Create a password"
                  required
                  minLength={8}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pl-11 pr-11 text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-white/40 mt-1.5">
                Must be at least 8 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  placeholder="Confirm your password"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pl-11 pr-11 text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#23FD9E] hover:bg-[#1ed189] text-[#1a1a1a] font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-white/40 text-sm mt-6">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/auth/login')}
            className="text-[#23FD9E] hover:text-[#23FD9E]/80 font-medium transition-colors"
          >
            Sign in
          </button>
        </p>
      </motion.div>
    </div>
  )
}
