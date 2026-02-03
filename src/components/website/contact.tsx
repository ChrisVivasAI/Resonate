"use client"

import { useState } from "react"
import Image from "next/image"

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          source: 'website',
          source_page: 'homepage',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form')
      }

      setSubmitStatus('success')
      setFormData({ name: '', email: '', message: '' })
    } catch (error) {
      setSubmitStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      id="contact"
      className="relative py-24 px-8 overflow-hidden bg-cover bg-center bg-fixed bg-[#1a1a1a]"
      style={{ backgroundImage: "url('/images/contact-bg.png')" }}
    >
      {/* Overlay to darken the background image */}
      <div className="absolute inset-0 bg-black/40" style={{ zIndex: 1 }} />

      <div className="relative z-10 max-w-6xl mx-auto">
        <h2 className="font-display text-4xl text-white text-center mb-16 tracking-display md:text-5xl">
          HAVE AN IDEA ? WORK WITH US
        </h2>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h3 className="font-display text-xl text-white tracking-wider mb-2">
                STUDIOS
              </h3>
              <p className="text-white/80 text-sm tracking-widest">
                46 NW 36ST MIAMI, FL 33127
              </p>
            </div>

            <div>
              <h3 className="font-display text-xl text-white tracking-wider mb-2">
                CONTACT US
              </h3>
              <p className="text-white/80 text-sm tracking-widest mb-1">
                786-557-9118
              </p>
              <p className="text-white/80 text-sm tracking-widest">
                WWW.HGABSTUDIOS.COM
              </p>
            </div>

            <div className="pt-4">
              <div className="relative w-48 h-16">
                <Image
                  src="/images/resonate-logo-white.png"
                  alt="Resonate"
                  fill
                  className="object-contain object-left"
                />
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/10 border-0 px-4 py-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white/10 border-0 px-4 py-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>
            <textarea
              placeholder="Message"
              rows={6}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full bg-white/10 border-0 px-4 py-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed text-white font-display text-lg tracking-widest py-4 transition-colors"
            >
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
            </button>

            {submitStatus === 'success' && (
              <p className="text-green-400 text-center text-sm mt-4">
                Thank you! We&apos;ll be in touch soon.
              </p>
            )}

            {submitStatus === 'error' && (
              <p className="text-red-400 text-center text-sm mt-4">
                {errorMessage}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}
