# Resonate - Creative Agency Platform

A modern, AI-powered creative agency management platform built with Next.js, Supabase, Stripe, and Google Gemini AI.

![Resonate](https://via.placeholder.com/1200x600/1a2337/ed741c?text=Resonate+Creative+Agency)

## Features

### 🎨 AI Creative Suite
- **Image Generation**: Generate stunning visuals using Gemini 3 Pro Image
- **Text Generation**: Create compelling copy with Gemini AI
- **Video Generation**: Create videos with Veo 3.1
- **Image Tools**: Upscale, remove backgrounds, enhance faces

### 📊 Project Management
- Track projects with status, progress, and deadlines
- Organize tasks with drag-and-drop boards
- Set milestones with payment triggers
- Tag and categorize projects

### 👥 Client Management
- Store client information and contact details
- Track client spending and project history
- Manage client statuses (active, inactive, lead)

### 💳 Payments & Invoicing
- Stripe integration for payments
- Create and send invoices
- Track payment status
- Automated milestone payments

### 🔐 Authentication
- Secure authentication with Supabase Auth
- Role-based access control (Admin, Member, Client)
- Protected routes and API endpoints

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **AI - Images**: Google Gemini 3 Pro Image
- **AI - Video**: Google Veo 3.1
- **AI - Text**: Google Gemini
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/resonate.git
cd resonate
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google Gemini API (for AI image/video generation)
GEMINI_API_KEY=your_gemini_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Set up the database:
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Run the schema from `supabase/schema.sql`

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

### Setting up Stripe Webhooks

For local development:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

For production, add the webhook endpoint in your Stripe dashboard:
- URL: `https://your-domain.com/api/webhooks/stripe`
- Events to listen for:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

## Project Structure

```
resonate/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Dashboard page
│   │   ├── projects/          # Projects pages
│   │   ├── clients/           # Clients pages
│   │   ├── payments/          # Payments pages
│   │   ├── ai-studio/         # AI generation studio
│   │   └── pages/             # Page builder
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   ├── layout/            # Layout components
│   │   ├── forms/             # Form components
│   │   └── page-builder/      # Page builder components
│   ├── lib/
│   │   ├── supabase/          # Supabase client config
│   │   ├── stripe/            # Stripe client config
│   │   ├── ai/                # AI service integrations
│   │   └── utils/             # Utility functions
│   ├── hooks/                 # Custom React hooks
│   ├── stores/                # Zustand stores
│   └── types/                 # TypeScript types
├── supabase/
│   └── schema.sql             # Database schema
└── public/                    # Static assets
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Make sure to set all environment variables in your Vercel project settings.

## API Reference

### AI Endpoints

#### Generate Image
```
POST /api/ai/image
{
  "prompt": "A modern logo...",
  "aspectRatio": "16:9",
  "numberOfImages": 1
}
```

#### Generate Video
```
POST /api/ai/video
{
  "prompt": "A cinematic scene...",
  "aspectRatio": "16:9",
  "duration": 4,
  "resolution": "720p"
}
```

#### Generate Text
```
POST /api/ai/text
{
  "prompt": "Write a tagline for...",
  "type": "tagline",
  "context": {
    "brand": "Acme Inc",
    "tone": "professional"
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Support

For support, email support@resonate.agency or open an issue on GitHub.
