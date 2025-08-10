import React from 'react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <div className="bg-brand-bg">
      <div className="container mx-auto flex flex-col items-center justify-center min-h-screen text-center px-6 py-20">
        <div className="bg-white p-10 rounded-lg shadow-xl max-w-lg">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h1 className="text-3xl font-bold text-brand-dark font-heading mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your payment. Your registration is complete and your spot is secured.
          </p>
          <p className="text-gray-600 mb-6">
            We have sent a confirmation email with your registration details. A member of our team will contact you within **24 hours** with the next steps.
          </p>
          <p className="text-sm text-gray-500">
            If you have any urgent questions, please contact our support team at <a href="mailto:mubeenacademy001@gmail.com" className="text-brand-primary font-semibold">mubeenacademy001@gmail.com</a>.
          </p>
          <div className="mt-8">
            <Link href="/" passHref>
              <button className="w-full rounded-md bg-brand-primary py-3 text-md font-semibold text-white transition-colors hover:bg-blue-600">
                Return to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}