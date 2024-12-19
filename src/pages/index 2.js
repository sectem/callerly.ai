import SignInForm from '@/components/auth/sign-in-form'

export default function Home() {
  return <SignInForm />
}

// Add noHeader flag to remove header
Home.noHeader = true 