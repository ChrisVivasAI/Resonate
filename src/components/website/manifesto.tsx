export function Manifesto() {
  return (
    <section id="about" className="relative min-h-screen flex items-center justify-center bg-[#1a1a1a] overflow-hidden">
      {/* Subtle blur effect */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-white/5 blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-white/5 blur-[100px] translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10 max-w-5xl mx-auto px-8 py-24 text-center">
        <h2 className="font-display text-6xl md:text-8xl text-white mb-12 tracking-tight lg:text-8xl">
          RESONATE OR DIE
        </h2>
        <p className="text-lg md:text-xl lg:text-2xl text-white leading-relaxed tracking-wide uppercase max-w-4xl mx-auto font-bold">
          As Resonate, we believe brands shouldn&apos;t just exist, they should echo. We create visuals, stories, and sound that cut through the noise and connect deeply, because in a world that forgets fast, you either resonate or die.
        </p>
      </div>
    </section>
  )
}
