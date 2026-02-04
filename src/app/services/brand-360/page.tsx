import { ServicePageTemplate } from '@/components/website'

export default function Brand360Page() {
  return (
    <ServicePageTemplate
      title="BRAND 360"
      tagline="BRANDS THAT CAN'T BE IGNORED"
      heroImage="/images/services/brand360/BRAND HERO.jpg"
      description="We build brands that can't be ignored, delivering everything from storytelling and campaigns to high-impact photo, video, and podcast content that makes your message impossible to miss."
      bulletPoints={[
        "Brand Strategy & Positioning",
        "Visual Identity Systems",
        "Campaign Development",
        "Content Production",
        "Podcast & Audio Branding",
        "Digital Marketing"
      ]}
      featureImage="/images/services/brand-360-feature.jpg"
      workItems={[
        { name: "BRAND IDENTITIES", image: "/images/services/work-sample.jpg" },
        { name: "CAMPAIGNS", image: "/images/services/work-sample.jpg" },
        { name: "COMMERCIALS", image: "/images/services/work-sample.jpg" },
        { name: "PODCASTS", image: "/images/services/work-sample.jpg" }
        //{ name: "SOCIAL CAMPAIGNS", image: "/images/services/work-sample.jpg" },
        //{ name: "PHOTOGRAPHY", image: "/images/services/work-sample.jpg" }
      ]}
      processTitle="THE BRAND BLUEPRINT"
      processDescription="Every iconic brand started with a story. We help you find yours and tell it in a way that commands attention and builds lasting loyalty."
      processSteps={[
        {
          number: "01",
          title: "IMMERSION",
          description: "We become students of your industry, your audience, and your competition. Knowledge is power, and we come prepared."
        },
        {
          number: "02",
          title: "ARCHITECTURE",
          description: "Brand positioning, messaging hierarchy, visual systems—we build the foundation that everything else will stand on."
        },
        {
          number: "03",
          title: "EXECUTION",
          description: "From photo shoots to podcast launches, we create content that embodies your brand at the highest level of quality."
        },
        {
          number: "04",
          title: "EVOLUTION",
          description: "Brands are living things. We monitor, measure, and refine to ensure your presence stays relevant and your message stays sharp."
        }
      ]}
    />
  )
}
