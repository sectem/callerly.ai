# XpertixeAI - AI-Powered Call Management Platform

A modern web application built with Next.js, Supabase, and Stripe for AI-powered call handling and appointment management.

## Features

- 🤖 AI-powered inbound call handling
- 📅 Automated appointment scheduling
- 💳 Subscription-based billing with Stripe
- 🔐 Secure authentication with Supabase
- 📱 Responsive dashboard interface
- 📊 Advanced analytics and reporting
- 🔄 CRM integrations

## Tech Stack

- **Frontend**: Next.js 14, React, Bootstrap
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Styling**: CSS Modules, Bootstrap Icons
- **Deployment**: Vercel

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn
- Supabase CLI
- Stripe CLI (for local webhook testing)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Stripe Product/Price IDs
NEXT_PUBLIC_STRIPE_BASIC_PLAN_ID=price_basic
NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_ID=price_premium
NEXT_PUBLIC_STRIPE_ENTERPRISE_PLAN_ID=price_enterprise
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/xpertixeai.git
   cd xpertixeai
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Run database migrations:
   ```bash
   supabase db push
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── src/
│   ├── app/                 # App router pages
│   ├── components/         # React components
│   │   ├── auth/          # Authentication components
│   │   ├── dashboard/     # Dashboard components
│   │   ├── layout/        # Layout components
│   │   └── ui/            # Reusable UI components
│   ├── context/           # React context providers
│   ├── pages/             # Pages router
│   │   ├── api/          # API routes
│   │   └── dashboard/    # Dashboard pages
│   ├── styles/            # CSS modules and global styles
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── public/                # Static files
└── supabase/             # Supabase configurations
    └── migrations/       # Database migrations
```

## Development Guidelines

### Code Style

- Use functional components with hooks
- Implement proper TypeScript types
- Follow the Next.js 14 best practices
- Use CSS Modules for styling
- Implement proper error handling
- Add JSDoc comments for complex functions

### Git Workflow

1. Create a new branch for each feature/fix
2. Follow conventional commits
3. Submit PR for review
4. Squash and merge after approval

### Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e
```

## Deployment

The application is configured for deployment on Vercel:

1. Push your changes to GitHub
2. Connect your repository to Vercel
3. Configure environment variables
4. Deploy!

## API Documentation

### Authentication Endpoints

- `POST /api/auth/check-user` - Check user existence
- `POST /api/auth/resend-verification` - Resend verification email

### Stripe Endpoints

- `POST /api/stripe/create-checkout-session` - Create checkout session
- `POST /api/stripe/create-portal-session` - Create customer portal session
- `POST /api/stripe/webhook` - Handle Stripe webhooks

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@xpertixeai.com or join our Slack channel.
