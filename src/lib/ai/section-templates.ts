// Section templates for AI context and component generation

export interface SectionTemplate {
  type: string
  name: string
  description: string
  defaultProps: Record<string, any>
  exampleCode: string
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    type: 'hero',
    name: 'Hero Section',
    description: 'Full-width hero section with headline, subheadline, and CTA buttons',
    defaultProps: {
      headline: 'Welcome to Our Platform',
      subheadline: 'The best solution for your needs',
      primaryCta: 'Get Started',
      secondaryCta: 'Learn More',
      backgroundType: 'gradient',
    },
    exampleCode: `
export default function HeroSection() {
  return (
    <section className="relative min-h-[600px] flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
      <div className="container mx-auto px-6 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Welcome to Our Platform
        </h1>
        <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          The best solution for your needs
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-8 py-4 bg-white text-primary rounded-lg font-semibold hover:bg-white/90 transition">
            Get Started
          </button>
          <button className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition">
            Learn More
          </button>
        </div>
      </div>
    </section>
  )
}`,
  },
  {
    type: 'features',
    name: 'Features Grid',
    description: 'Grid layout showing product features with icons and descriptions',
    defaultProps: {
      columns: 3,
      features: [
        { icon: 'Zap', title: 'Fast', description: 'Lightning fast performance' },
        { icon: 'Shield', title: 'Secure', description: 'Enterprise-grade security' },
        { icon: 'Heart', title: 'Loved', description: 'Loved by thousands of users' },
      ],
    },
    exampleCode: `
import { Zap, Shield, Heart } from 'lucide-react'

const features = [
  { icon: Zap, title: 'Fast', description: 'Lightning fast performance' },
  { icon: Shield, title: 'Secure', description: 'Enterprise-grade security' },
  { icon: Heart, title: 'Loved', description: 'Loved by thousands of users' },
]

export default function FeaturesSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-6 rounded-xl bg-white shadow-sm hover:shadow-md transition">
              <feature.icon className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,
  },
  {
    type: 'testimonials',
    name: 'Testimonials',
    description: 'Customer testimonials with quotes and avatars',
    defaultProps: {
      testimonials: [
        {
          quote: 'This product changed everything for us.',
          author: 'Jane Doe',
          role: 'CEO, Company',
          avatar: '/avatars/jane.jpg',
        },
      ],
    },
    exampleCode: `
const testimonials = [
  {
    quote: 'This product changed everything for us.',
    author: 'Jane Doe',
    role: 'CEO, Company',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12">What Our Customers Say</h2>
        <div className="max-w-3xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-8 rounded-xl shadow-sm">
              <p className="text-xl italic text-gray-700 mb-6">"{testimonial.quote}"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20" />
                <div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-gray-500 text-sm">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,
  },
  {
    type: 'cta',
    name: 'Call to Action',
    description: 'Compelling CTA section with heading and action buttons',
    defaultProps: {
      headline: 'Ready to get started?',
      subheadline: 'Join thousands of satisfied customers today.',
      buttonText: 'Start Free Trial',
    },
    exampleCode: `
export default function CTASection() {
  return (
    <section className="py-20 bg-primary">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to get started?
        </h2>
        <p className="text-xl text-white/80 mb-8">
          Join thousands of satisfied customers today.
        </p>
        <button className="px-8 py-4 bg-white text-primary rounded-lg font-semibold hover:bg-white/90 transition">
          Start Free Trial
        </button>
      </div>
    </section>
  )
}`,
  },
  {
    type: 'contact',
    name: 'Contact Form',
    description: 'Contact form with input fields for name, email, and message',
    defaultProps: {
      fields: ['name', 'email', 'message'],
      submitText: 'Send Message',
    },
    exampleCode: `
export default function ContactSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6 max-w-2xl">
        <h2 className="text-3xl font-bold text-center mb-12">Get in Touch</h2>
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition resize-none"
              placeholder="Your message"
            />
          </div>
          <button
            type="submit"
            className="w-full py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition"
          >
            Send Message
          </button>
        </form>
      </div>
    </section>
  )
}`,
  },
  {
    type: 'pricing',
    name: 'Pricing Table',
    description: 'Pricing plans comparison table',
    defaultProps: {
      plans: [
        { name: 'Basic', price: '$9/mo', features: ['Feature 1', 'Feature 2'] },
        { name: 'Pro', price: '$29/mo', features: ['Feature 1', 'Feature 2', 'Feature 3'], popular: true },
        { name: 'Enterprise', price: '$99/mo', features: ['All features'] },
      ],
    },
    exampleCode: `
import { Check } from 'lucide-react'

const plans = [
  { name: 'Basic', price: '$9', features: ['Feature 1', 'Feature 2'] },
  { name: 'Pro', price: '$29', features: ['Feature 1', 'Feature 2', 'Feature 3'], popular: true },
  { name: 'Enterprise', price: '$99', features: ['All features'] },
]

export default function PricingSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12">Pricing</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={\`p-8 rounded-xl bg-white \${plan.popular ? 'ring-2 ring-primary shadow-lg' : 'shadow-sm'}\`}
            >
              {plan.popular && (
                <span className="px-3 py-1 text-xs font-semibold text-primary bg-primary/10 rounded-full">
                  Popular
                </span>
              )}
              <h3 className="text-xl font-bold mt-4">{plan.name}</h3>
              <p className="text-4xl font-bold my-4">{plan.price}<span className="text-lg text-gray-500">/mo</span></p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button className={\`w-full py-3 rounded-lg font-semibold transition \${
                plan.popular
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }\`}>
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,
  },
  {
    type: 'stats',
    name: 'Statistics',
    description: 'Key statistics and metrics display',
    defaultProps: {
      stats: [
        { value: '10K+', label: 'Users' },
        { value: '99%', label: 'Uptime' },
        { value: '24/7', label: 'Support' },
      ],
    },
    exampleCode: `
const stats = [
  { value: '10K+', label: 'Users' },
  { value: '99%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
]

export default function StatsSection() {
  return (
    <section className="py-20 bg-primary">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {stats.map((stat, index) => (
            <div key={index}>
              <p className="text-5xl font-bold text-white mb-2">{stat.value}</p>
              <p className="text-lg text-white/80">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,
  },
  {
    type: 'header',
    name: 'Header Navigation',
    description: 'Site header with logo, navigation links, and CTA',
    defaultProps: {
      logo: 'Brand',
      links: ['Home', 'Features', 'Pricing', 'Contact'],
      ctaText: 'Sign Up',
    },
    exampleCode: `
import { Menu } from 'lucide-react'

export default function Header() {
  return (
    <header className="py-4 bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 flex items-center justify-between">
        <div className="text-2xl font-bold text-primary">Brand</div>
        <nav className="hidden md:flex items-center gap-8">
          {['Home', 'Features', 'Pricing', 'Contact'].map((link) => (
            <a key={link} href={\`#\${link.toLowerCase()}\`} className="text-gray-600 hover:text-primary transition">
              {link}
            </a>
          ))}
        </nav>
        <button className="hidden md:block px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition">
          Sign Up
        </button>
        <button className="md:hidden p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  )
}`,
  },
  {
    type: 'footer',
    name: 'Footer',
    description: 'Site footer with links, social icons, and copyright',
    defaultProps: {
      columns: [
        { title: 'Product', links: ['Features', 'Pricing', 'FAQ'] },
        { title: 'Company', links: ['About', 'Blog', 'Careers'] },
        { title: 'Support', links: ['Help', 'Contact', 'Status'] },
      ],
    },
    exampleCode: `
const columns = [
  { title: 'Product', links: ['Features', 'Pricing', 'FAQ'] },
  { title: 'Company', links: ['About', 'Blog', 'Careers'] },
  { title: 'Support', links: ['Help', 'Contact', 'Status'] },
]

export default function Footer() {
  return (
    <footer className="py-12 bg-gray-900 text-white">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="text-2xl font-bold mb-4">Brand</div>
            <p className="text-gray-400">Building the future, one pixel at a time.</p>
          </div>
          {columns.map((column, index) => (
            <div key={index}>
              <h4 className="font-semibold mb-4">{column.title}</h4>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-gray-400 hover:text-white transition">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-gray-800 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Brand. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}`,
  },
  {
    type: 'gallery',
    name: 'Image Gallery',
    description: 'Grid gallery of images',
    defaultProps: {
      columns: 3,
      images: [],
    },
    exampleCode: `
export default function GallerySection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12">Gallery</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="aspect-square bg-gray-200 rounded-lg overflow-hidden hover:opacity-90 transition cursor-pointer"
            >
              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,
  },
  {
    type: 'text',
    name: 'Text Content',
    description: 'Rich text content section',
    defaultProps: {
      title: 'About Us',
      content: 'Lorem ipsum dolor sit amet...',
    },
    exampleCode: `
export default function TextSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6 max-w-3xl">
        <h2 className="text-3xl font-bold mb-6">About Us</h2>
        <div className="prose prose-lg">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
            quis nostrud exercitation ullamco laboris.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
            dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
            proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
        </div>
      </div>
    </section>
  )
}`,
  },
]

export function getTemplateByType(type: string): SectionTemplate | undefined {
  return SECTION_TEMPLATES.find((t) => t.type === type)
}
