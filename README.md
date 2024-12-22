# XpertixeAI - AI-Powered Call Management Platform

A modern web application built with Next.js, Supabase, and Stripe for AI-powered call handling and appointment management.

## Features

- 🤖 AI-powered inbound call handling
- 📅 Automated appointment scheduling
- 💳 Credit-based wallet system for call minutes
- 🔐 Secure authentication with Supabase
- 📱 Responsive dashboard interface
- 📊 Usage analytics and reporting
- 🔄 CRM integrations
- 📝 Customizable AI agent scripts and messages

## Tech Stack

- **Frontend**: Next.js 14, React, Bootstrap
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Styling**: CSS Modules, Bootstrap Icons
- **Deployment**: Vercel

## Database Structure

### Key Tables

- `vapi_agents`: Stores AI agent configurations and message templates
  - Basic agent information (name, phone number)
  - Message templates (first message, end call message, voicemail message)
  - References to scripts

- `scripts`: Stores AI agent scripts and content
  - Main script content
  - Title and metadata
  - Associated with agents via foreign key

- `wallets`: Stores user credit information
  - Available credits (in minutes)
  - Credit usage history
  - Transaction records

### Credit System

The platform uses a credit-based wallet system:
- Credits are purchased and stored in the user's wallet
- Each minute of agent call time consumes one credit
- Users can top up their wallet at any time
- Usage history and remaining credits are tracked in real-time

### Message Templates

The system uses three types of message templates for each agent:
1. **First Message**: Initial greeting when the call starts
2. **End Call Message**: Closing message before ending the call
3. **Voicemail Message**: Message left when the call goes to voicemail

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

# Product Configuration
NEXT_PUBLIC_CREDIT_PRICE_PER_MINUTE=your_price_per_minute
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
│   │   │   ├── vapi/    # VAPI integration endpoints
│   │   │   └── wallet/  # Wallet management endpoints
│   │   └── dashboard/    # Dashboard pages
│   ├── styles/            # CSS modules and global styles
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── public/                # Static files
└── supabase/             # Supabase configurations
    └── migrations/       # Database migrations
```

## API Endpoints

### VAPI Integration Endpoints

- `POST /api/vapi/create-agent` - Create a new AI agent with script and messages
  - Creates script content
  - Sets up message templates
  - Associates with phone number

- `PUT /api/vapi/update-script` - Update an existing agent's script and messages
  - Updates script content
  - Updates message templates
  - Updates agent configuration

### Wallet Management Endpoints

- `POST /api/wallet/add-credits` - Purchase and add credits to wallet
- `GET /api/wallet/balance` - Get current wallet balance
- `GET /api/wallet/usage-history` - Get credit usage history
- `POST /api/wallet/deduct-credits` - Deduct credits after call completion

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
