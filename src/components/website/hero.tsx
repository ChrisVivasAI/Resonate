"use client"

import Image from "next/image"
import { useState } from "react"

export function Hero() {
  const [videoError, setVideoError] = useState(false)

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {!videoError ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/images/hero.jpg"
          onError={() => setVideoError(true)}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/hero-banner.mp4" type="video/mp4" />
        </video>
      ) : (
        <Image
          src="/images/hero.jpg"
          alt="Artistic mirrored figure in teal atmosphere"
          fill
          className="object-cover"
          priority
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
    </section>
  )
}
