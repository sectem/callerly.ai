import Image from 'next/image'

export default function AuthLayout({ children, title }) {
  return (
    <div className="container-fluid vh-100 p-0">
      <div className="row h-100 g-0">
        <div className="col-lg-6 bg-dark d-none d-lg-block">
          <div className="position-relative h-100">
            {/* Background image will go here */}
          </div>
        </div>
        
        <div className="col-lg-6 bg-white h-100">
          <div className="d-flex flex-column h-100 p-4 pt-5">
            <div className="text-center mb-4">
              <Image
                src="/images/logo.png"
                alt="Logo"
                width={180}
                height={48}
                priority
                style={{ objectFit: 'contain' }}
              />
            </div>
            
            <div className="flex-grow-1 d-flex flex-column justify-content-center">
              <div className="mx-auto" style={{ maxWidth: '420px' }}>
                <h2 className="text-center mb-4 fs-4">{title}</h2>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 