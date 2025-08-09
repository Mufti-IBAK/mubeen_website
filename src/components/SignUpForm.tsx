'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const SignUpForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    const { error } = await supabase
      .from('newsletter_signups')
      .insert({ name, email });

    setIsSubmitting(false);

    if (error) {
      // Handle potential duplicate email error gracefully
      if (error.code === '23505') { // PostgreSQL unique violation code
        setMessage('This email address has already been registered. Thank you!');
        setIsSuccess(true);
      } else {
        setMessage('An error occurred. Please try again.');
        setIsSuccess(false);
      }
    } else {
      setMessage('Thank you for your interest! We will keep you updated.');
      setIsSuccess(true);
      setName('');
      setEmail('');
    }
  };

  return (
    <div className="text-center">
      <h3 className="text-2xl font-bold text-brand-dark font-heading mb-2">Stay Updated</h3>
      <p className="text-brand-dark/70 mb-6">
        Join our mailing list to receive news about upcoming programs and events.
      </p>

      {isSuccess ? (
        <p className="text-green-600 font-semibold">{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Your Name (Optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <input
            type="email"
            placeholder="Your Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-brand-primary text-white font-semibold py-3 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Sign Up'}
          </button>
          {message && <p className="text-red-500 text-sm mt-2">{message}</p>}
        </form>
      )}
    </div>
  );
};