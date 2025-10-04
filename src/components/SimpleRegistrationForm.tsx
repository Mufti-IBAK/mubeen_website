/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Program } from './ProgramCard';
import { FormInput } from './FormInput';

interface SimpleRegistrationFormProps {
  selectedProgram: Program | null;
}

export const SimpleRegistrationForm: React.FC<SimpleRegistrationFormProps> = ({ selectedProgram }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phoneNumber) return;
    setIsSubmitting(true);
    setMessage('');
    try {
      const { error } = await supabase.from('program_inquiries').insert({
          full_name: fullName,
          email: email,
          phone_number: phoneNumber,
          program_title: selectedProgram?.title || 'Unknown Program',
      });
      if (error) throw error;
      setMessage('Thank you for your interest! We will contact you shortly with the next steps.');
      setIsSuccess(true);
    } catch (err: any) {
      setMessage('An error occurred. Please try again.');
      setIsSuccess(false);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-bold text-green-600 font-heading mb-4">Inquiry Received!</h2>
        <p className="text-gray-600">{message}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-brand-dark font-heading text-center mb-2">
        Inquire about {selectedProgram?.title || 'Our Program'}
      </h2>
      <p className="text-center text-gray-600 mb-6">Provide your details, and our team will contact you to finalize enrollment.</p>
      <form onSubmit={handleSubmit}>
        <FormInput id="fullName" name="fullName" label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <FormInput id="email" name="email" label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <FormInput id="phoneNumber" name="phoneNumber" label="Phone Number" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
        <div className="mt-6">
          <button type="submit" disabled={isSubmitting} className="w-full bg-brand-primary text-white font-semibold py-3 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
          </button>
          {message && !isSuccess && <p className="text-red-500 text-sm text-center mt-4">{message}</p>}
        </div>
      </form>
    </div>
  );
};