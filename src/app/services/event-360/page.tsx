import { ServicePageTemplate } from '@/components/website'

export default function Event360Page() {
  return (
    <ServicePageTemplate
      title="EVENT 360"
      tagline="TURNING MOMENTS INTO MOVEMENTS"
      heroImage="/images/services/event-360-hero.jpg"
      description="We don't just cover events, we turn them into culture. From cinematic recaps and striking photography to real-time content drops, we make sure your moment lives far beyond the night it happens."
      bulletPoints={[
        "Event Photography & Videography",
        "Cinematic Recap Videos",
        "Real-Time Social Content",
        "Live Streaming",
        "Pre & Post Event Marketing",
        "Highlight Reels"
      ]}
      featureImage="/images/services/event-360-feature.jpg"
      workItems={[
        { name: "RECAP VIDEOS", image: "/images/services/work-sample.jpg" },
        { name: "PHOTOGRAPHY", image: "/images/services/work-sample.jpg" },
        { name: "LIVE STREAMS", image: "/images/services/work-sample.jpg" },
        { name: "SOCIAL DROPS", image: "/images/services/work-sample.jpg" }
        //{ name: "HIGHLIGHT REELS", image: "/images/services/work-sample.jpg" },
        //{ name: "BTS CONTENT", image: "/images/services/work-sample.jpg" }
      ]}
      processTitle="THE EVENT EXPERIENCE"
      processDescription="An event is a moment in time—but the content lives forever. We capture every angle so your event becomes a story that keeps being told."
      processSteps={[
        {
          number: "01",
          title: "PRE-PRODUCTION",
          description: "We plan every shot before the doors open. Understanding the venue, the vibe, and the key moments ensures nothing gets missed."
        },
        {
          number: "02",
          title: "CAPTURE",
          description: "Multiple crews, multiple angles, real-time coordination. We move with the energy of the event to catch moments as they happen."
        },
        {
          number: "03",
          title: "DELIVER",
          description: "Same-night social drops, next-day highlights, full cinematic recaps—we match our delivery speed to your marketing needs."
        },
        {
          number: "04",
          title: "EXTEND",
          description: "The event ends but the content keeps working. We repurpose, redistribute, and keep your moment alive across platforms."
        }
      ]}
    />
  )
}
