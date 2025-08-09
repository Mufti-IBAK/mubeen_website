'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Program } from './ProgramCard';
import { FormInput } from './FormInput';

// Define the props for this simple form
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
    setIsSubmitting(true);
    setMessage('');

    const { error } = await supabase
      .from('registrations') // We can use the same table
      .insert({
        name: fullName,
        email: email,
        phone_number: phoneNumber,
        program_title: selectedProgram?.title || 'Unknown Program',
        payment_status: 'pending-contact', // A different status for these leads
      });
    
    setIsSubmitting(false);

    if (error) {
      setMessage('An error occurred. Please try again.');
      setIsSuccess(false);
    } else {
      setMessage('Thank you for your interest! We will contact you shortly with the next steps.');
      setIsSuccess(true);
      setFullName('');
      setEmail('');
      setPhoneNumber('');
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-bold text-green-600 font-heading mb-4">Registration Received!</h2>
        <p className="text-gray-600">{message}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-brand-dark font-heading text-center mb-2">
        Register for {selectedProgram?.title || 'Our Program'}
      </h2>
      <p className="text-center text-gray-600 mb-6">
        Please provide your details, and a member of our team will contact you to finalize your enrollment.
      </p>

      <form onSubmit={handleSubmit}>
        <FormInput 
          id="fullName" 
          label="Full Name" 
          value={fullName} 
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <FormInput 
          id="email" 
          label="Email Address" 
          type="email"
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <FormInput 
          id="phoneNumber" 
          label="Phone Number" 
          type="tel"
          value={phoneNumber} 
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />

        <div className="mt-6">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-brand-primary text-white font-semibold py-3 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
          </button>
          {message && !isSuccess && <p className="text-red-500 text-sm text-center mt-4">{message}</p>}
        </div>
      </form>
    </div>
  );
}