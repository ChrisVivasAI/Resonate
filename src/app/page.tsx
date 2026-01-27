import { Header, Hero, Manifesto, Partners, Services, Contact } from '@/components/website'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#1a1a1a]">
      <Header />
      <Hero />
      <Manifesto />
      <Partners />
      <Services />
      <Contact />
    </main>
  )
}
