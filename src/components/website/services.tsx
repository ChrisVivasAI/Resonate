import Link from "next/link"
import Image from "next/image"

export function Services() {
  const services = [
    {
      title: "ARTIST 360",
      description: "For creators, musicians, and influencers ready to blow past the noise, we craft visuals, content, and narratives that grow your audience, sharpen your image, and put you in the spotlight where you belong.",
      href: "/services/artist-360",
      icon: "/images/services/icon-artist.png"
    },
    {
      title: "BRAND 360",
      description: "We build brands that can't be ignored, delivering everything from storytelling and campaigns to high-impact photo, video, and podcast content that makes your message impossible to miss.",
      href: "/services/brand-360",
      icon: "/images/services/icon-brand.png"
    },
    {
      title: "EVENT 360",
      description: "We don't just cover events, we turn them into culture. From cinematic recaps and striking photography to real-time content drops, we make sure your moment lives far beyond the night it happens.",
      href: "/services/event-360",
      icon: "/images/services/icon-event.png"
    }
  ]

  return (
    <section id="services" className="relative bg-[#f0eeeb] py-24 px-8 overflow-hidden">
      {/* Dark wisp blur effects */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] rounded-full bg-black/[0.06] blur-[100px] -translate-x-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-black/[0.08] blur-[120px] translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-black/[0.05] blur-[80px] translate-x-1/2" />
      <div className="absolute top-0 left-1/3 w-[350px] h-[350px] rounded-full bg-black/[0.04] blur-[70px] -translate-y-1/2" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <h2 className="font-display text-6xl md:text-7xl lg:text-8xl text-black text-center mb-20 tracking-display">
          OUR SERVICES
        </h2>

        <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
          {services.map((service) => (
            <Link key={service.title} href={service.href} className="text-center group">
              <h3 className="font-display text-3xl md:text-4xl text-black mb-6 tracking-display group-hover:opacity-70 transition-opacity">
                {service.title}
              </h3>

              {/* Service icon */}
              <div className="relative h-10 mb-6 flex items-center justify-center">
                <div className="relative w-36 h-36">
                  <Image
                    src={service.icon}
                    alt={`${service.title} icon`}
                    fill
                    className="object-contain opacity-40 group-hover:opacity-60 transition-opacity"
                  />
                </div>
              </div>

              <p className="text-gray-700 leading-relaxed text-base md:text-lg font-semibold">
                {service.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
