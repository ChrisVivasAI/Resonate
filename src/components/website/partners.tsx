'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

const partners = [
  { name: 'Britto', logo: '/images/partners/Britto.png' },
  { name: 'Core Water', logo: '/images/partners/Core water.png' },
  { name: 'Deep Eddy Vodka', logo: '/images/partners/Deep Eddy Vocka.png' },
  { name: 'Fendi', logo: '/images/partners/Fendi.png' },
  { name: 'IGK', logo: '/images/partners/IGK.png' },
  { name: 'Live Nation', logo: '/images/partners/Live Nation.png' },
  { name: 'Maxim', logo: '/images/partners/Maxim.png' },
  { name: 'R&Co', logo: '/images/partners/R&Co.png' },
  { name: 'Redbull', logo: '/images/partners/Redbull.png' },
  { name: 'Sobe Promo', logo: '/images/partners/Sobe Promo.png' },
  { name: 'UFC', logo: '/images/partners/UFC.png' },
]

export function Partners() {
  // Triple the partners array to ensure continuous scroll without gaps
  const marqueePartners = [...partners, ...partners, ...partners]

  return (
    <section className="py-12 md:py-24 bg-[#1a1a1a] overflow-hidden">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 px-6 md:px-12">
        {/* Title Section */}
        <div className="flex-shrink-0">
          <h2 className="font-display text-4xl md:text-5xl lg:text-7xl text-white tracking-tight leading-none text-center lg:text-left">
            CREATIVE<br />PARTNERS
          </h2>
        </div>

        {/* Marquee Section */}
        <div className="flex-1 w-full relative group">
          <div className="flex overflow-hidden">
            <motion.div
              className="flex whitespace-nowrap"
              animate={{ x: [0, '-50%'] }}
              transition={{
                duration: 50,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                display: 'flex',
                gap: '6rem',
                paddingRight: '6rem'
              }}
              whileHover={{ animationPlayState: 'paused' as any }}
            >
              {marqueePartners.map((partner, index) => (
                <div
                  key={`${partner.name}-${index}`}
                  className="flex items-center justify-center min-w-[200px] md:min-w-[350px] lg:min-w-[450px] h-24 md:h-36 lg:h-48 px-4 filter grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={partner.logo}
                      alt={partner.name}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 200px, (max-width: 1024px) 350px, 450px"
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
