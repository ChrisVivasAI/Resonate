"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { Header } from "./header"

interface WorkItem {
  name: string
  image?: string
}

interface ProcessStep {
  number: string
  title: string
  description: string
}

interface ServicePageProps {
  title: string
  tagline: string
  heroImage: string
  description: string
  bulletPoints: string[]
  featureImage: string
  workItems: WorkItem[]
  processTitle: string
  processDescription: string
  processSteps: ProcessStep[]
}

// Masonry layout pattern: indices mapped to size classes
const masonrySizes: ('tall' | 'wide' | 'normal')[] = [
  'tall', 'normal', 'normal', 'wide', 'normal', 'tall'
]

export function ServicePageTemplate({
  title,
  tagline,
  heroImage,
  description,
  bulletPoints,
  featureImage,
  workItems,
  processTitle,
  processDescription,
  processSteps,
}: ServicePageProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

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
          subject: formData.subject,
          message: formData.message,
          source: 'website',
          source_page: title.toLowerCase().replace(/\s+/g, '-'),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form')
      }

      setSubmitStatus('success')
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (error) {
      setSubmitStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
  }, [])

  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    setLightboxIndex(prev => {
      if (prev === null) return null
      const total = workItems.length
      if (direction === 'next') return (prev + 1) % total
      return (prev - 1 + total) % total
    })
  }, [workItems.length])

  return (
    <main className="min-h-screen bg-[#1a1a1a]">
      <Header />

      {/* Hero Section */}
      <section className="relative h-screen w-full">
        <Image
          src={heroImage || "/placeholder.svg"}
          alt={title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <h1 className="font-display text-7xl md:text-9xl text-white tracking-display">
            {title}
          </h1>
          <p className="font-display text-2xl md:text-3xl text-white tracking-wider mt-2">
            {tagline}
          </p>
          <Link
            href="#contact"
            className="mt-8 px-8 py-3 bg-neutral-600/80 text-white font-display text-sm tracking-widest rounded-full hover:bg-neutral-500/80 transition-colors"
          >
            LETS WORK
          </Link>
        </div>
      </section>

      {/* Split Content Section */}
      <section className="bg-[#f8f7f4]">
        <div className="flex flex-col lg:flex-row">
          {/* Left Content */}
          <div className="lg:w-1/2 p-12 lg:p-20 flex flex-col justify-center">
            <h2 className="font-display text-6xl md:text-7xl text-neutral-900 mb-8 tracking-display">
              {title}
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-10 max-w-lg text-lg md:text-xl">
              {description}
            </p>
            <ul className="space-y-5 mb-12">
              {bulletPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-neutral-900 rounded-full mt-2.5 flex-shrink-0" />
                  <span className="font-semibold text-neutral-900 text-lg">{point}</span>
                </li>
              ))}
            </ul>
            <Link
              href="#contact"
              className="inline-block px-8 py-4 bg-neutral-900 text-white font-display text-sm tracking-widest rounded-full hover:bg-neutral-800 transition-colors self-start"
            >
              LEARN MORE
            </Link>
          </div>

          {/* Right Image */}
          <div className="lg:w-1/2 relative min-h-[500px] lg:min-h-[700px]">
            <Image
              src={featureImage || "/placeholder.svg"}
              alt={`${title} feature`}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Our Work Section — Masonry Gallery */}
      <section className="bg-[#f8f7f4] py-20 px-8 lg:px-20">
        <h2 className="font-display text-6xl md:text-7xl text-neutral-900 text-center mb-16 tracking-display">
          OUR WORK
        </h2>
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 auto-rows-[200px] md:auto-rows-[250px] gap-4">
          {workItems.map((item, index) => {
            const size = masonrySizes[index % masonrySizes.length]
            const spanClass =
              size === 'tall' ? 'row-span-2' :
              size === 'wide' ? 'col-span-2' :
              ''

            return (
              <div
                key={index}
                className={`relative group cursor-pointer overflow-hidden ${spanClass}`}
                onClick={() => openLightbox(index)}
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-neutral-200" />
                )}
                {/* Hover overlay with project name */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-end">
                  <span className="font-display text-white text-lg tracking-wider p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {item.name}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-white/70 hover:text-white text-4xl font-light z-10 transition-colors"
            aria-label="Close lightbox"
          >
            &times;
          </button>

          {/* Previous button */}
          <button
            onClick={(e) => { e.stopPropagation(); navigateLightbox('prev') }}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-5xl font-light z-10 transition-colors"
            aria-label="Previous image"
          >
            &#8249;
          </button>

          {/* Image */}
          <div
            className="relative w-[90vw] h-[80vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            {workItems[lightboxIndex]?.image ? (
              <Image
                src={workItems[lightboxIndex].image!}
                alt={workItems[lightboxIndex].name}
                fill
                className="object-contain"
              />
            ) : (
              <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center">
                <span className="text-white/50 font-display text-2xl">{workItems[lightboxIndex]?.name}</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
              <span className="font-display text-white text-xl tracking-wider">
                {workItems[lightboxIndex]?.name}
              </span>
            </div>
          </div>

          {/* Next button */}
          <button
            onClick={(e) => { e.stopPropagation(); navigateLightbox('next') }}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-5xl font-light z-10 transition-colors"
            aria-label="Next image"
          >
            &#8250;
          </button>
        </div>
      )}

      {/* Process Section */}
      <section className="bg-[#2d2d2d] py-20 px-8 lg:px-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left Side */}
          <div>
            <h2 className="font-display text-6xl md:text-7xl text-white mb-8 tracking-display">
              {processTitle}
            </h2>
            <p className="text-neutral-400 leading-relaxed text-lg md:text-xl">
              {processDescription}
            </p>
          </div>

          {/* Right Side - Steps */}
          <div className="space-y-12">
            {processSteps.map((step) => (
              <div key={step.number}>
                <h3 className="font-display text-4xl md:text-5xl text-white mb-4 tracking-display">
                  {step.number} {step.title}
                </h3>
                <p className="text-neutral-400 leading-relaxed text-base md:text-lg">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section — Dark BG */}
      <section
        id="contact"
        className="relative py-20 px-8 lg:px-20 overflow-hidden bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url('/images/contact-bg.jpg')" }}
      >
        {/* Dark fallback */}
        <div className="absolute inset-0 bg-[#1a1a1a]" style={{ zIndex: 0 }} />
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" style={{ zIndex: 1 }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="font-display text-5xl md:text-6xl text-white text-center mb-12 tracking-display">
            GET IN TOUCH
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="text"
              placeholder="Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-6 py-4 bg-white/10 border-0 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <input
              type="email"
              placeholder="Email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-6 py-4 bg-white/10 border-0 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <input
              type="text"
              placeholder="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-6 py-4 bg-white/10 border-0 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <textarea
              placeholder="Message"
              required
              rows={8}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-6 py-4 bg-white/10 border-0 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 resize-y"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 bg-white/20 text-white font-display text-sm tracking-widest hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
            </button>

            {submitStatus === 'success' && (
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 font-medium">Thank you for reaching out!</p>
                <p className="text-green-400/70 text-sm mt-1">We&apos;ll get back to you soon.</p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400">{errorMessage}</p>
              </div>
            )}
          </form>
        </div>
      </section>
    </main>
  )
}
