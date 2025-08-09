/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useMemo } from 'react';
import { RegistrationFormData, Plan } from '@/types';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { FormCheckbox } from './FormCheckbox';
import { Program } from './ProgramCard';
import { supabase } from '@/lib/supabaseClient';

// --- Reusable & Typed Form Components ---
interface FormTextAreaProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  required?: boolean;
  rows?: number;
}
const FormTextArea: React.FC<FormTextAreaProps> = ({ id, label, value, onChange, required = true, rows = 4 }) => (
    <div className="mb-4">
        <label htmlFor={id} className="block text-sm font-medium text-brand-dark/80 mb-1">{label}</label>
        <textarea id={id} name={id} value={value} onChange={onChange} required={required} rows={rows} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"></textarea>
    </div>
);

const PlanCard: React.FC<{ plan: Plan; onSelect: () => void }> = ({ plan, onSelect }) => (
    <button onClick={onSelect} className="p-6 border-2 border-gray-200 rounded-lg text-left hover:border-brand-primary hover:bg-brand-primary/5 transition-all flex flex-col h-full">
        <h4 className="text-lg font-bold text-brand-dark">{plan.title}</h4>
        {plan.price_per_semester && <p className="text-2xl font-bold text-brand-primary mt-2">₦{plan.price_per_semester.toLocaleString()}<span className="text-sm font-normal text-gray-500">/semester</span></p>}
        {plan.price_per_month && <p className="text-md font-semibold text-gray-600">or ₦{plan.price_per_month.toLocaleString()}/month</p>}
        <ul className="flex-grow mt-4 space-y-2">{plan.features.map((feature: string) => (<li key={feature} className="flex items-center text-sm text-gray-600"><svg className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>{feature}</li>))}</ul>
    </button>
);

const ProgressBar = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
    const progress = currentStep > 0 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;
    // The inline style here is a necessary exception for dynamic width.
    return (<div className="w-full bg-gray-200 rounded-full h-2.5 mb-8"><div className="bg-brand-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>);
};

declare const FlutterwaveCheckout: any;

interface RegistrationFormProps {
  selectedProgram: Program | null;
  availablePlans: Plan[];
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ selectedProgram, availablePlans }) => {
  const [formData, setFormData] = useState<RegistrationFormData>({
    enrollmentType: '',
    fullName: '', gender: '', dateOfBirth: '', guardianName: '', phoneNumber: '', email: '', address: '', communicationMode: '', emergencyContact: '',
    category: '', classType: '', paymentOption: '', paymentMethod: '', paymentMethodOther: '', paymentAssistance: '',
    primaryGoals: '', quranicKnowledgeLevel: '', attendedVirtualClasses: '', virtualClassChallenges: [], virtualClassChallengesOther: '', personalChallenges: '', supportExpectations: '', hoursPerWeek: '', sessionPreference: '', extraMentorshipInterest: '',
    commitToDuration: false, consentToCommunications: false, understandRenewal: false, signature: '',
    payerFullName: '', payerEmail: '', payerPhoneNumber: '', familyMembers: [],
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalSteps = 5;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1: return !!(formData.fullName && formData.gender && formData.dateOfBirth && formData.phoneNumber && formData.email);
      case 2: return !!(formData.category && formData.classType && formData.paymentOption && formData.paymentMethod);
      case 3: return !!(formData.primaryGoals && formData.quranicKnowledgeLevel && formData.hoursPerWeek);
      case 4: return !!(formData.commitToDuration && formData.consentToCommunications && formData.understandRenewal && formData.signature);
      default: return true;
    }
  }, [formData, currentStep]);

  const handlePlanSelect = (plan: 'individual' | 'family') => {
    setFormData(prev => ({ ...prev, enrollmentType: plan }));
    setCurrentStep(1);
  };
  
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepValid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase.from('registrations').insert({
          name: formData.fullName, email: formData.email, phone_number: formData.phoneNumber,
          gender: formData.gender, date_of_birth: formData.dateOfBirth, address: formData.address,
          communication_mode: formData.communicationMode, emergency_contact: formData.emergencyContact,
          category: formData.category, class_type: formData.classType, payment_option: formData.paymentOption,
          payment_method: formData.paymentMethod, primary_goals: formData.primaryGoals,
          quranic_knowledge_level: formData.quranicKnowledgeLevel, hours_per_week: formData.hoursPerWeek,
          signature: formData.signature, program_title: selectedProgram?.title,
      }).select().single();

      if (supabaseError) throw supabaseError;
      if (!data) throw new Error("Failed to create registration record.");

      FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY!,
        tx_ref: data.id,
        amount: 20000,
        currency: "NGN",
        payment_options: "card, banktransfer, ussd",
        redirect_url: `/payment-success`,
        customer: { email: formData.email, phone_number: formData.phoneNumber, name: formData.fullName },
        customizations: { title: "Mubeen Academy", description: `Payment for ${selectedProgram?.title}`, logo: "https://www.mubeenacademy.com/logo.png" },
        callback: function (response: any) { console.log("Flutterwave transaction successful:", response); },
        onclose: function() { console.log('Payment modal closed.'); setIsSubmitting(false); },
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        console.error("Submission Error:", err.message);
      } else {
        setError("An unexpected error occurred.");
        console.error("Submission Error:", err);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl max-w-2xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-brand-dark font-heading text-center mb-2">Register for {selectedProgram?.title || 'Our Program'}</h2>
      {currentStep === 0 ? (<p className="text-center text-gray-600 mb-6">Review the plans below to get started.</p>) : (<p className="text-center text-gray-600 mb-6">Please complete all required fields.</p>)}
      <div className="mt-6">
        {currentStep > 0 && <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />}
        {currentStep === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {availablePlans.map(plan => ( <PlanCard key={plan.id} plan={plan} onSelect={() => handlePlanSelect(plan.plan_type)} /> ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className={currentStep === 0 ? 'hidden' : 'block'}>
            {currentStep === 1 && (
                <div>
                    <h3 className="text-xl font-semibold text-brand-dark mb-4">Section 1: Personal Information</h3>
                    <FormInput id="fullName" label="Full Name" value={formData.fullName} onChange={handleChange} />
                    <FormSelect id="gender" label="Gender" value={formData.gender} onChange={handleChange} options={[{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}]} />
                    <FormInput id="dateOfBirth" label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={handleChange} />
                    <FormInput id="phoneNumber" label="Phone Number (WhatsApp Preferred)" type="tel" value={formData.phoneNumber} onChange={handleChange} />
                    <FormInput id="email" label="Email Address" type="email" value={formData.email} onChange={handleChange} />
                    <FormTextArea id="address" label="Residential Address (State & Country)" value={formData.address} onChange={handleChange} />
                    <FormSelect id="communicationMode" label="Preferred Communication" value={formData.communicationMode} onChange={handleChange} options={[{value: 'WhatsApp', label: 'WhatsApp'}, {value: 'Email', label: 'Email'}, {value: 'Call', label: 'Call'}]} />
                    <FormInput id="guardianName" label="Parent/Guardian Name (if applicable)" value={formData.guardianName} onChange={handleChange} required={false} />
                    <FormInput id="emergencyContact" label="Emergency Contact (Name & Number)" value={formData.emergencyContact} onChange={handleChange} />
                </div>
            )}
            {currentStep === 2 && (
                <div>
                    <h3 className="text-xl font-semibold text-brand-dark mb-4">Section 2: Program & Payment</h3>
                    <FormSelect id="category" label="Category" value={formData.category} onChange={handleChange} options={[{value: 'Junior (1-3 Terms)', label: 'Junior (1-3 Terms)'}, {value: 'Senior (4-6 Terms)', label: 'Senior (4-6 Terms)'}]} />
                    <FormSelect id="classType" label="Enrollment Type" value={formData.classType} onChange={handleChange} options={[{value: 'Group Class', label: 'Group Class'}, {value: 'Private Class', label: 'Private Class'}]} />
                    <FormSelect id="paymentOption" label="Payment Option" value={formData.paymentOption} onChange={handleChange} options={[{value: 'Full Subscription', label: 'Full Subscription (₦20,000)'}, {value: 'Installments', label: 'Installments (₦3,000 x 3 months)'}]} />
                    <FormSelect id="paymentMethod" label="Preferred Payment Method" value={formData.paymentMethod} onChange={handleChange} options={[{value: 'Bank Transfer', label: 'Bank Transfer'}, {value: 'Mobile Transfer', label: 'Mobile Transfer'}, {value: 'USSD', label: 'USSD'}, {value: 'Others', label: 'Others'}]} />
                </div>
            )}
            {currentStep === 3 && (
                <div>
                    <h3 className="text-xl font-semibold text-brand-dark mb-4">Section 3: Learning Expectations</h3>
                    <FormTextArea id="primaryGoals" label="What are your primary goals for this program?" value={formData.primaryGoals} onChange={handleChange} />
                    <FormSelect id="quranicKnowledgeLevel" label="Current Qur'anic Knowledge Level" value={formData.quranicKnowledgeLevel} onChange={handleChange} options={[{value: 'Beginner', label: 'Beginner'}, {value: 'Intermediate', label: 'Intermediate'}, {value: 'Advanced', label: 'Advanced'}]} />
                    <FormInput id="hoursPerWeek" label="How many hours per week can you dedicate?" type="number" value={formData.hoursPerWeek} onChange={handleChange} />
                </div>
            )}
            {currentStep === 4 && (
                <div>
                    <h3 className="text-xl font-semibold text-brand-dark mb-4">Section 4: Consent & Declarations</h3>
                    <FormCheckbox id="commitToDuration" label="I agree to commit to the term duration (3 months + 2 weeks flex)." checked={formData.commitToDuration} onChange={handleChange} />
                    <FormCheckbox id="consentToCommunications" label="I consent to receiving communications regarding schedules and materials." checked={formData.consentToCommunications} onChange={handleChange} />
                    <FormCheckbox id="understandRenewal" label="I understand that payment covers one term and renewal is required to continue." checked={formData.understandRenewal} onChange={handleChange} />
                    <FormInput id="signature" label="Signature (Full Name as Consent)" value={formData.signature} onChange={handleChange} />
                </div>
            )}
            
            {error && <p className="text-red-500 text-sm text-center my-4">Error: {error}</p>}

            <div className="flex justify-between mt-8">
                <button type="button" onClick={prevStep} className={`px-6 py-2 border border-gray-300 rounded-md font-semibold transition-colors ${currentStep <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`} disabled={currentStep <= 1}>Back</button>
                {currentStep < totalSteps - 1 ? (
                    <button type="button" onClick={nextStep} className={`px-6 py-2 bg-brand-primary text-white rounded-md font-semibold transition-colors ${!isStepValid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`} disabled={!isStepValid}>Next</button>
                ) : (
                    <button type="submit" className={`px-6 py-2 bg-green-600 text-white rounded-md font-semibold transition-colors ${!isStepValid || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`} disabled={!isStepValid || isSubmitting}>{isSubmitting ? 'Processing...' : 'Proceed to Payment'}</button>
                )}
            </div>
        </form>
      </div>
    </div>
  );
};