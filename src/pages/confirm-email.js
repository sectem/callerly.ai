'use client';

import { Container, Card } from 'react-bootstrap';
import Image from 'next/image';
import Link from 'next/link';

export default function ConfirmEmail() {
  return (
    <div className="min-vh-100 bg-light d-flex align-items-center">
      <Container>
        <Card className="mx-auto shadow-sm" style={{ maxWidth: '500px' }}>
          <Card.Body className="p-4 text-center">
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={140}
              height={36}
              priority
              style={{ objectFit: 'contain' }}
              className="mb-4"
            />

            <div className="mb-4">
              <div className="display-6 mb-2">✉️</div>
              <h2 className="fs-4 mb-3">Check your email</h2>
              <p className="text-muted mb-0">
                We've sent you an email with a link to verify your account.
                Please check your inbox and spam folder.
              </p>
            </div>

            <div className="text-muted small">
              <p className="mb-3">
                Didn't receive the email? Check your spam folder or{' '}
                <Link href="/signup" className="text-decoration-none">
                  try signing up again
                </Link>
              </p>
              <p className="mb-0">
                Already verified?{' '}
                <Link href="/login" className="text-decoration-none">
                  Log in
                </Link>
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
} 