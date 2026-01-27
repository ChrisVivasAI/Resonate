import { ServicePageTemplate } from '@/components/website'

export default function Artist360Page() {
  return (
    <ServicePageTemplate
      title="ARTIST 360"
      tagline="FULL SPECTRUM ARTIST DEVELOPMENT"
      heroImage="/images/services/artist360/ARTIST HERO.jpg"
      description="For creators, musicians, and influencers ready to blow past the noise, we craft visuals, content, and narratives that grow your audience, sharpen your image, and put you in the spotlight where you belong."
      bulletPoints={[
        "Visual Identity & Branding",
        "Content Strategy & Creation",
        "Social Media Management",
        "Music Video Production",
        "Press Kit & EPK Development",
        "Merchandise Design"
      ]}
      featureImage="/images/services/artist-360-feature.jpg"
      workItems={[
        { name: "MUSIC VIDEOS", image: "/images/services/work-sample.jpg" },
        { name: "ALBUM ART", image: "/images/services/work-sample.jpg" },
        { name: "PRESS KITS", image: "/images/services/work-sample.jpg" },
        { name: "SOCIAL CONTENT", image: "/images/services/work-sample.jpg" },
        { name: "MERCHANDISE", image: "/images/services/work-sample.jpg" },
        { name: "LIVE VISUALS", image: "/images/services/work-sample.jpg" }
      ]}
      processTitle="THE ARTIST JOURNEY"
      processDescription="We don't just create content—we build legacies. Our process is designed to understand your unique voice and amplify it across every platform."
      processSteps={[
        {
          number: "01",
          title: "DISCOVERY",
          description: "We dive deep into your vision, influences, and goals. Understanding who you are is the first step to showing the world who you're meant to be."
        },
        {
          number: "02",
          title: "STRATEGY",
          description: "From content calendars to visual direction, we build a roadmap that keeps your presence consistent and your message clear."
        },
        {
          number: "03",
          title: "CREATION",
          description: "This is where the magic happens. Photo shoots, video production, graphic design—we bring your vision to life with cinematic quality."
        },
        {
          number: "04",
          title: "AMPLIFY",
          description: "We don't just post and pray. Strategic releases, platform optimization, and engagement tactics ensure your content reaches the right eyes."
        }
      ]}
    />
  )
}
