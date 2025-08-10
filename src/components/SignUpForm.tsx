/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FormCheckbox } from './FormCheckbox'; // We will reuse our accessible checkbox

// A temporary, local text area component for this form
const FormTextArea = ({ id, label, value, onChange, required = true, rows = 3 }: any) => (
    <div className="mb-4">
        <label htmlFor={id} className="block text-sm font-medium text-brand-dark/80 mb-1">{label}</label>
        <textarea id={id} name={id} value={value} onChange={onChange} required={required} rows={rows} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"></textarea>
    </div>
);


export const SignUpForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inquiry, setInquiry] = useState(''); // State for the new description field
  const [subscribe, setSubscribe] = useState(true); // State for the new checkbox, default to true
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    // FIX: The insert object now includes the new fields
    const { error } = await supabase
      .from('newsletter_signups')
      .insert({ 
        name: name, 
        email: email,
        inquiry_description: inquiry,
        subscribed_to_newsletter: subscribe
      });

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        setMessage('This email address has already been registered. Thank you!');
        setIsSuccess(true);
      } else {
        setMessage('An error occurred. Please try again.');
        setIsSuccess(false);
      }
    } else {
      setMessage('Thank you for reaching out! We will be in touch shortly.');
      setIsSuccess(true);
      setName('');
      setEmail('');
      setInquiry('');
      setSubscribe(true);
    }
  };

  if (isSuccess) {
    return (
        <div className="text-center">
            <h3 className="text-2xl font-bold text-green-600 font-heading mb-2">Submission Received!</h3>
            <p className="text-gray-600">{message}</p>
        </div>
    );
  }

  return (
    <div className="text-center">
      <h3 className="text-2xl font-bold text-brand-dark font-heading mb-2">Contact Us</h3>
      <p className="text-brand-dark/70 mb-6">
        Have a question or want to stay updated? Let us know.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
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
        {/* FIX: Added the new Text Area for inquiry description */}
        <textarea 
            id="inquiry"
            name="inquiry"
            placeholder="Tell us how we can help..."
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
        {/* FIX: Added the new Checkbox for newsletter subscription */}
        <FormCheckbox
            id="subscribe"
            label="Yes, I want to receive news and updates via email."
            checked={subscribe}
            onChange={(e) => setSubscribe(e.target.checked)}
            required={false}
        />
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-brand-primary text-white font-semibold py-3 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
        {message && !isSuccess && <p className="text-red-500 text-sm mt-2 text-center">{message}</p>}
      </form>
    </div>
  );
};