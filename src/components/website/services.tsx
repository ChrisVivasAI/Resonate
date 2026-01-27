import Link from "next/link"

export function Services() {
  const services = [
    {
      title: "ARTIST 360",
      description: "For creators, musicians, and influencers ready to blow past the noise, we craft visuals, content, and narratives that grow your audience, sharpen your image, and put you in the spotlight where you belong.",
      href: "/services/artist-360"
    },
    {
      title: "BRAND 360",
      description: "We build brands that can't be ignored, delivering everything from storytelling and campaigns to high-impact photo, video, and podcast content that makes your message impossible to miss.",
      href: "/services/brand-360"
    },
    {
      title: "EVENT 360",
      description: "We don't just cover events, we turn them into culture. From cinematic recaps and striking photography to real-time content drops, we make sure your moment lives far beyond the night it happens.",
      href: "/services/event-360"
    }
  ]

  return (
    <section id="services" className="relative bg-[#f5f5f5] py-24 px-8 overflow-hidden">
      {/* Blur effects */}
      <div className="absolute top-1/4 left-0 w-[400px] h-[400px] rounded-full bg-black/5 blur-[80px] -translate-x-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-black/5 blur-[100px] translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-[300px] h-[300px] rounded-full bg-black/5 blur-[60px] translate-x-1/2" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <h2 className="font-display text-5xl md:text-6xl lg:text-7xl text-black text-center mb-20 tracking-tight">
          OUR SERVICES
        </h2>

        <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
          {services.map((service) => (
            <Link key={service.title} href={service.href} className="text-center group">
              <h3 className="font-display text-2xl md:text-3xl text-black mb-6 tracking-tight group-hover:opacity-70 transition-opacity">
                {service.title}
              </h3>

              {/* Abstract brush stroke decoration */}
              <div className="relative h-16 mb-6 flex items-center justify-center">
                <svg viewBox="0 0 100 40" className="w-24 h-auto opacity-30 group-hover:opacity-50 transition-opacity">
                  <path
                    d="M10 20 Q30 5, 50 20 T90 20"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <p className="text-gray-700 leading-relaxed text-sm md:text-base font-semibold">
                {service.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
