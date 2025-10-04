/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useMemo } from 'react';
import { RegistrationFormData, Program } from '@/types';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { FormCheckbox } from './FormCheckbox';
import { supabase } from '@/lib/supabaseClient';

// --- Reusable & Typed Form Components ---
interface FormTextAreaProps { id: string; name: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; required?: boolean; rows?: number; }
const FormTextArea: React.FC<FormTextAreaProps> = ({ id, name, label, value, onChange, required = true, rows = 4 }) => (
    <div className="mb-4"><label htmlFor={id} className="block text-sm font-medium text-brand-dark/80 mb-1">{label}</label><textarea id={id} name={name} value={value} onChange={onChange} required={required} rows={rows} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"></textarea></div>
);

// Progress bar removed per requirements

declare const FlutterwaveCheckout: any;

interface IndividualFormFlowProps {
  selectedProgram: Program | null;
  onBack: () => void;
}

export const IndividualFormFlow: React.FC<IndividualFormFlowProps> = ({ selectedProgram, onBack }) => {
  const [formData, setFormData] = useState<RegistrationFormData>({
    enrollmentType: 'individual',
    familySize: '',
    fullName: '', gender: '', dateOfBirth: '', guardianName: '', phoneNumber: '', email: '', address: '', communicationMode: '', emergencyContact: '',
    category: '', classType: '', paymentOption: '', paymentMethod: '', paymentMethodOther: '', paymentAssistance: '',
    primaryGoals: '', quranicKnowledgeLevel: '', attendedVirtualClasses: '', virtualClassChallenges: [], virtualClassChallengesOther: '', personalChallenges: '', supportExpectations: '', hoursPerWeek: '', sessionPreference: '', extraMentorshipInterest: '',
    commitToDuration: false, consentToCommunications: false, understandRenewal: false, signature: '',
    payerFullName: '', payerEmail: '', payerPhoneNumber: '', familyMembers: [],
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalSteps = 4;

  const paymentAmount = useMemo(() => {
    if (formData.paymentOption.includes('Installments')) return 3000;
    return 20000;
  }, [formData.paymentOption]);

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
      case 1: return !!(formData.fullName && formData.gender && formData.dateOfBirth && formData.phoneNumber && formData.email && formData.address && formData.communicationMode && formData.emergencyContact);
      case 2: return !!(formData.category && formData.classType && formData.paymentOption && formData.paymentMethod);
      case 3: return !!(formData.primaryGoals && formData.quranicKnowledgeLevel && formData.attendedVirtualClasses && formData.hoursPerWeek && formData.sessionPreference && formData.extraMentorshipInterest);
      case 4: return !!(formData.commitToDuration && formData.consentToCommunications && formData.understandRenewal && formData.signature);
      default: return false;
    }
  }, [formData, currentStep]);

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepValid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.fullName, email: formData.email, program: selectedProgram?.title, category: formData.category, enrollmentType: formData.classType }),
      });
      const { data, error: supabaseError } = await supabase.from('registrations_24_month').insert({
          full_name: formData.fullName, gender: formData.gender, date_of_birth: formData.dateOfBirth, guardian_name: formData.guardianName, phone_number: formData.phoneNumber, email: formData.email, address: formData.address, communication_mode: formData.communicationMode, emergency_contact: formData.emergencyContact,
          category: formData.category, class_type: formData.classType, payment_option: formData.paymentOption, payment_method: formData.paymentMethod, payment_method_other: formData.paymentMethodOther, payment_assistance: formData.paymentAssistance,
          primary_goals: formData.primaryGoals, quranic_knowledge_level: formData.quranicKnowledgeLevel, attended_virtual_classes: formData.attendedVirtualClasses, virtual_class_challenges: formData.virtualClassChallenges, virtual_class_challenges_other: formData.virtualClassChallengesOther, personal_challenges: formData.personalChallenges, support_expectations: formData.supportExpectations, hours_per_week: formData.hoursPerWeek, session_preference: formData.sessionPreference, extra_mentorship_interest: formData.extraMentorshipInterest,
          commit_to_duration: formData.commitToDuration, consent_to_communications: formData.consentToCommunications, understand_renewal: formData.understandRenewal, signature: formData.signature,
          program_title: selectedProgram?.title,
      }).select().single();
      if (supabaseError) throw supabaseError;
      if (!data) throw new Error("Failed to create registration record.");
      FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY!, tx_ref: data.id, amount: paymentAmount, currency: "NGN",
        redirect_url: `/payment-success?ref=${data.id}`, customer: { email: formData.email, phone_number: formData.phoneNumber, name: formData.fullName },
        customizations: { title: "Mubeen Academy", description: `Payment for ${selectedProgram?.title}`, logo: "https://www.your-deployed-site.com/logo.png" },
        onclose: () => { setIsSubmitting(false); }
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-brand-dark">Individual Registration</h3>
            <button onClick={onBack} className="text-sm text-gray-600 hover:text-brand-primary underline">
                Back to Plan Selection
            </button>
        </div>
        <form onSubmit={handleSubmit}>
            {currentStep === 1 && (
                <div>
                    <h4 className="text-lg font-bold text-brand-dark mb-4">Section 1: Personal Information</h4>
                    <FormInput id="fullName" name="fullName" label="Full Name" value={formData.fullName} onChange={handleChange} />
                    <FormSelect id="gender" name="gender" label="Gender" value={formData.gender} onChange={handleChange} options={[{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}]} />
                    <FormInput id="dateOfBirth" name="dateOfBirth" label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={handleChange} />
                    <FormInput id="guardianName" name="guardianName" label="Parent/Guardian Name (if applicable)" value={formData.guardianName} onChange={handleChange} required={false} />
                    <FormInput id="phoneNumber" name="phoneNumber" label="Phone Number (WhatsApp Preferred)" type="tel" value={formData.phoneNumber} onChange={handleChange} />
                    <FormInput id="email" name="email" label="Email Address" type="email" value={formData.email} onChange={handleChange} />
                    <FormTextArea id="address" name="address" label="Residential Address (State & Country)" value={formData.address} onChange={handleChange} />
                    <FormSelect id="communicationMode" name="communicationMode" label="Preferred Mode of Communication" value={formData.communicationMode} onChange={handleChange} options={[{value: 'WhatsApp', label: 'WhatsApp'}, {value: 'Email', label: 'Email'}, {value: 'Call', label: 'Call'}]} />
                    <FormInput id="emergencyContact" name="emergencyContact" label="Emergency Contact Person & Number" value={formData.emergencyContact} onChange={handleChange} />
                </div>
            )}
            {currentStep === 2 && ( 
                <div>
                    <h4 className="text-lg font-bold text-brand-dark mb-4">Section 2: Program & Payment Details</h4>
                    <FormSelect id="category" name="category" label="Category" value={formData.category} onChange={handleChange} options={[{value: 'Junior (1-3 Terms)', label: 'Junior (1-3 Terms)'}, {value: 'Senior (4-6 Terms)', label: 'Senior (4-6 Terms)'}]} />
                    <FormSelect id="classType" name="classType" label="Enrollment Type" value={formData.classType} onChange={handleChange} options={[{value: 'Group Class', label: 'Group Class'}, {value: 'Private Class', label: 'Private Class'}]} />
                    <FormSelect id="paymentOption" name="paymentOption" label="Payment Option" value={formData.paymentOption} onChange={handleChange} options={[{value: 'Full Subscription (₦20,000)', label: 'Full Subscription (₦20,000)'}, {value: 'Installments', label: 'Installments (₦3,000)'}]} />
                    <FormSelect id="paymentMethod" name="paymentMethod" label="Preferred Payment Method" value={formData.paymentMethod} onChange={handleChange} options={[{value: 'Bank Transfer', label: 'Bank Transfer'}, {value: 'Mobile Transfer', label: 'Mobile Transfer'}, {value: 'USSD', label: 'USSD'}, {value: 'Others', label: 'Others'}]} />
                    {formData.paymentMethod === 'Others' && <FormInput id="paymentMethodOther" name="paymentMethodOther" label="If “Others”, specify payment method" value={formData.paymentMethodOther} onChange={handleChange} />}
                    <FormSelect id="paymentAssistance" name="paymentAssistance" label="Do you need assistance with setting up payments?" value={formData.paymentAssistance} onChange={handleChange} options={[{value: 'Yes', label: 'Yes'}, {value: 'No', label: 'No'}]} />
                </div>
            )}
            {currentStep === 3 && ( 
                <div>
                    <h4 className="text-lg font-bold text-brand-dark mb-4">Section 3: Learning Expectations</h4>
                    <FormTextArea id="primaryGoals" name="primaryGoals" label="What are your primary goals for joining this program?" value={formData.primaryGoals} onChange={handleChange} />
                    <FormSelect id="quranicKnowledgeLevel" name="quranicKnowledgeLevel" label="What is your current Qur'anic knowledge level?" value={formData.quranicKnowledgeLevel} onChange={handleChange} options={[{value: 'Beginner', label: 'Beginner'}, {value: 'Intermediate', label: 'Intermediate'}, {value: 'Advanced', label: 'Advanced'}]} />
                    <FormSelect id="attendedVirtualClasses" name="attendedVirtualClasses" label="Have you ever attended virtual Islamic classes before?" value={formData.attendedVirtualClasses} onChange={handleChange} options={[{value: 'Yes', label: 'Yes'}, {value: 'No', label: 'No'}]} />
                    <FormTextArea id="personalChallenges" name="personalChallenges" label="Do you face any personal challenges in learning?" value={formData.personalChallenges} onChange={handleChange} />
                    <FormTextArea id="supportExpectations" name="supportExpectations" label="What are your expectations from us regarding support?" value={formData.supportExpectations} onChange={handleChange} />
                    <FormInput id="hoursPerWeek" name="hoursPerWeek" label="How many hours per week can you dedicate?" type="number" value={formData.hoursPerWeek} onChange={handleChange} />
                    <FormSelect id="sessionPreference" name="sessionPreference" label="Do you prefer live sessions, recorded, or both?" value={formData.sessionPreference} onChange={handleChange} options={[{value: 'Live', label: 'Live'}, {value: 'Recorded', label: 'Recorded'}, {value: 'Both', label: 'Both'}]} />
                    <FormSelect id="extraMentorshipInterest" name="extraMentorshipInterest" label="Interested in extra mentorship or study groups?" value={formData.extraMentorshipInterest} onChange={handleChange} options={[{value: 'Yes', label: 'Yes'}, {value: 'No', label: 'No'}]} />
                </div>
            )}
            {currentStep === 4 && ( 
                <div>
                    <h4 className="text-lg font-bold text-brand-dark mb-4">Section 4: Consent & Declarations</h4>
                    <FormCheckbox id="commitToDuration" name="commitToDuration" label="I agree to commit to the term duration (3 months + 2 weeks flex)." checked={formData.commitToDuration} onChange={handleChange} />
                    <FormCheckbox id="consentToCommunications" name="consentToCommunications" label="I consent to receiving communications regarding schedules and materials." checked={formData.consentToCommunications} onChange={handleChange} />
                    <FormCheckbox id="understandRenewal" name="understandRenewal" label="I understand that payment covers one term and renewal is required to continue." checked={formData.understandRenewal} onChange={handleChange} />
                    <FormInput id="signature" name="signature" label="Signature (Full Name as Consent)" value={formData.signature} onChange={handleChange} />
                </div>
            )}
            {error && <p className="text-red-500 text-sm text-center my-4">Error: {error}</p>}
            <div className="flex justify-between mt-8">
                <button type="button" onClick={prevStep} className={`px-6 py-2 border border-gray-300 rounded-md font-semibold transition-colors ${currentStep <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`} disabled={currentStep <= 1}>Back</button>
                {currentStep < totalSteps ? (
                    <button type="button" onClick={nextStep} className={`px-6 py-2 bg-brand-primary text-white rounded-md font-semibold transition-colors ${!isStepValid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`} disabled={!isStepValid}>Next</button>
                ) : (
                    <button type="submit" className={`px-6 py-2 bg-green-600 text-white rounded-md font-semibold transition-colors ${!isStepValid || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`} disabled={!isStepValid || isSubmitting}>{isSubmitting ? 'Processing...' : 'Proceed to Payment'}</button>
                )}
            </div>
        </form>
    </div>
  );
};