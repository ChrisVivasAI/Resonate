"use client"

import { useState } from "react"
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
          <h1 className="font-display text-7xl md:text-9xl text-white tracking-tight">
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
          <div className="lg:w-1/2 p-12 lg:p-20">
            <h2 className="font-display text-5xl md:text-6xl text-neutral-900 mb-6">
              {title}
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-8 max-w-md">
              {description}
            </p>
            <ul className="space-y-4 mb-10">
              {bulletPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-neutral-900 rounded-full mt-2 flex-shrink-0" />
                  <span className="font-semibold text-neutral-900">{point}</span>
                </li>
              ))}
            </ul>
            <Link
              href="#contact"
              className="inline-block px-8 py-4 bg-neutral-900 text-white font-display text-sm tracking-widest rounded-full hover:bg-neutral-800 transition-colors"
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

      {/* Our Work Section */}
      <section className="bg-[#f8f7f4] py-20 px-8 lg:px-20">
        <h2 className="font-display text-5xl md:text-6xl text-neutral-900 text-center mb-16">
          OUR WORK
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {workItems.map((item, index) => (
            <div key={index} className="flex flex-col items-center">
              {item.image ? (
                <div className="relative w-full aspect-[4/3] mb-4">
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-[4/3] mb-4 bg-neutral-200" />
              )}
              <h3 className="font-display text-2xl tracking-wider text-neutral-900">
                {item.name}
              </h3>
            </div>
          ))}
        </div>
      </section>

      {/* Process Section */}
      <section className="bg-[#2d2d2d] py-20 px-8 lg:px-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left Side */}
          <div>
            <h2 className="font-display text-5xl md:text-6xl text-white mb-8">
              {processTitle}
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              {processDescription}
            </p>
          </div>

          {/* Right Side - Steps */}
          <div className="space-y-12">
            {processSteps.map((step) => (
              <div key={step.number}>
                <h3 className="font-display text-3xl md:text-4xl text-white mb-4">
                  {step.number} {step.title}
                </h3>
                <p className="text-neutral-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="relative bg-[#f8f7f4] py-20 px-8 lg:px-20 overflow-hidden">
        {/* Decorative blur elements */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-neutral-300/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-neutral-400/30 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl text-neutral-900 text-center mb-12">
            GET IN TOUCH
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="text"
              placeholder="Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-6 py-4 bg-white border border-neutral-200 text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400"
            />
            <input
              type="email"
              placeholder="Email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-6 py-4 bg-white border border-neutral-200 text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400"
            />
            <input
              type="text"
              placeholder="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-6 py-4 bg-white border border-neutral-200 text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400"
            />
            <textarea
              placeholder="Message"
              required
              rows={8}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-6 py-4 bg-white border border-neutral-200 text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400 resize-y"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 bg-[#2d2d2d] text-white font-display text-sm tracking-widest hover:bg-neutral-700 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
            </button>

            {submitStatus === 'success' && (
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 font-medium">Thank you for reaching out!</p>
                <p className="text-green-600 text-sm mt-1">We&apos;ll get back to you soon.</p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{errorMessage}</p>
              </div>
            )}
          </form>
        </div>
      </section>
    </main>
  )
}
