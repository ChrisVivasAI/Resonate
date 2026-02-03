export function Manifesto() {
  return (
    <section
      id="about"
      className="relative flex items-center justify-center overflow-hidden bg-cover bg-center bg-fixed min-h-[80vh]"
      style={{ backgroundImage: "url('/images/contact-bg.png')" }}
    >
      {/* Slight overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black/40" style={{ zIndex: 1 }} />

      <div className="relative z-10 max-w-5xl mx-auto px-8 py-24 text-center">
        <h2 className="font-display text-6xl md:text-8xl text-white mb-12 tracking-display lg:text-8xl">
          RESONATE OR DIE
        </h2>
        <p className="text-lg md:text-xl lg:text-2xl text-white leading-relaxed tracking-wide uppercase max-w-4xl mx-auto font-bold">
          As Resonate, we believe brands shouldn&apos;t just exist, they should echo. We create visuals, stories, and sound that cut through the noise and connect deeply, because in a world that forgets fast, you either resonate or die.
        </p>
      </div>
    </section>
  )
}
