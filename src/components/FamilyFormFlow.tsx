/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plan, Program, FamilyMember } from '@/types';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { FormCheckbox } from './FormCheckbox';
import { supabase } from '@/lib/supabaseClient';

interface FormTextAreaProps { id: string; name: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; required?: boolean; rows?: number; }
const FormTextArea: React.FC<FormTextAreaProps> = ({ id, name, label, value, onChange, required = true, rows = 4 }) => ( <div className="mb-4"><label htmlFor={id} className="block text-sm font-medium text-brand-dark/80 mb-1">{label}</label><textarea id={id} name={name} value={value} onChange={onChange} required={required} rows={rows} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"></textarea></div>);
const ProgressBar = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => { const progress = currentStep > 0 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0; return (<div className="w-full bg-gray-200 rounded-full h-2.5 mb-8"><div className="bg-brand-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>); };

declare const FlutterwaveCheckout: any;

interface FamilyFormFlowProps {
  selectedProgram: Program | null;
  familyPlanDetails: Plan;
  onBack: () => void;
}

export const FamilyFormFlow: React.FC<FamilyFormFlowProps> = ({ selectedProgram, familyPlanDetails, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [payerInfo, setPayerInfo] = useState({ payerFullName: '', payerEmail: '', payerPhoneNumber: '' });
  const [planSelection, setPlanSelection] = useState({ familySize: '', classType: '', paymentOption: '' });
  const [members, setMembers] = useState<Partial<FamilyMember>[]>([]);
  const [consent, setConsent] = useState({ consentToCommunications: false, signature: '' });

  const priceDetails = useMemo(() => {
    if (planSelection.familySize && planSelection.paymentOption && familyPlanDetails.family_size_options) {
        const option = familyPlanDetails.family_size_options.find(o => o.size === planSelection.familySize);
        if (option?.prices) {
            return (option.prices as any)[planSelection.paymentOption.toLowerCase()];
        }
    }
    return null;
  }, [planSelection.familySize, planSelection.paymentOption, familyPlanDetails]);
  
  useEffect(() => {
    const sizeStr = planSelection.familySize;
    const count = sizeStr === 'Family of 2' ? 2 : sizeStr === 'Family of 3' ? 3 : 0;
    setMembers(Array.from({ length: count }, (_, i) => ({ id: i + 1, fullName: '', gender: '', dateOfBirth: '', primaryGoals: '', quranicKnowledgeLevel: '', virtualClassChallenges: [], personalChallenges: '', supportExpectations: '', hoursPerWeek: '' })));
  }, [planSelection.familySize]);

  const totalSteps = 2 + members.length + 1;

  const handlePayerChange = (e: React.ChangeEvent<HTMLInputElement>) => setPayerInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => setPlanSelection(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleMemberChange = (id: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [e.target.name]: e.target.value } : m));
  };
  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target;
    setConsent(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const isEnquiry = planSelection.familySize.includes('Full House') || planSelection.classType === 'Private Class';

    try {
        if (isEnquiry) {
            const { error: inquiryError } = await supabase.from('program_inquiries').insert({
                full_name: payerInfo.payerFullName, email: payerInfo.payerEmail, phone_number: payerInfo.payerPhoneNumber,
                program_title: `${selectedProgram?.title} (${planSelection.familySize} / ${planSelection.classType})`,
            });
            if (inquiryError) throw inquiryError;
            setCurrentStep(99);
        } else {
            const { data: familyRecord, error: familyError } = await supabase.from('family_registrations').insert({
                payer_full_name: payerInfo.payerFullName, payer_email: payerInfo.payerEmail, payer_phone_number: payerInfo.payerPhoneNumber,
                program_title: selectedProgram?.title, family_size: planSelection.familySize, enrollment_type: planSelection.classType,
                payment_option: planSelection.paymentOption, amount_paid: priceDetails,
            }).select().single();
            if (familyError) throw familyError;
            const memberRecords = members.map(({ id, ...rest }) => ({ family_registration_id: familyRecord.id, ...rest }));
            const { error: memberError } = await supabase.from('family_members_detailed').insert(memberRecords);
            if (memberError) throw memberError;
            FlutterwaveCheckout({
                public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY!, tx_ref: familyRecord.id, amount: priceDetails, currency: "NGN",
                redirect_url: `/payment-success?ref=${familyRecord.id}`, customer: { email: payerInfo.payerEmail, phone_number: payerInfo.payerPhoneNumber, name: payerInfo.payerFullName },
                customizations: { title: "Mubeen Academy", description: `Payment for ${selectedProgram?.title} (Family Plan)` },
            });
        }
    } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
    } finally {
        setIsSubmitting(false);
    }
  };

  if (currentStep === 99) { /* ... Success UI ... */ }

  return (
    <div>
      <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-semibold text-brand-dark">Family Registration</h3><button onClick={onBack} className="text-sm text-gray-600 hover:text-brand-primary underline">Back to Plan Selection</button></div>
      <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
      <form onSubmit={handleSubmit}>
          {currentStep === 1 && (
            <div>
              <h4 className="text-lg font-bold text-brand-dark mb-4">Step 1: Select Your Plan</h4>
              <FormSelect id="familySize" name="familySize" label="Number of Family Members" value={planSelection.familySize} onChange={handlePlanChange} options={familyPlanDetails.family_size_options?.map(o => ({ value: o.size, label: o.size })) ?? []} />
              <FormSelect id="classType" name="classType" label="Enrollment Type" value={planSelection.classType} onChange={handlePlanChange} options={[{ value: 'Group Class', label: 'Group Class'}, { value: 'Private Class', label: 'Private Class'}]} />
              {priceDetails !== null && (<FormSelect id="paymentOption" name="paymentOption" label="Payment Schedule" value={planSelection.paymentOption} onChange={handlePlanChange} options={[{ value: 'full', label: `Full per Semester: ₦${priceDetails.full.toLocaleString()}`}, { value: 'term', label: `Per Term: ₦${priceDetails.term.toLocaleString()}`}, { value: 'installment', label: `Per Month: ₦${priceDetails.installment.toLocaleString()}`}]} />)}
              {(planSelection.familySize.includes('Full House') || planSelection.classType === 'Private Class') && (<div className="mt-4 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-md"><p className="font-semibold">For this selection, please submit your contact details. Our team will reach out to you with a personalized quote.</p></div>)}
            </div>
          )}
          {currentStep === 2 && (
            <div>
                <h4 className="text-lg font-bold text-brand-dark mb-4">Step 2: Payer Information</h4>
                <FormInput id="payerFullName" name="payerFullName" label="Your Full Name" value={payerInfo.payerFullName} onChange={handlePayerChange} />
                <FormInput id="payerEmail" name="payerEmail" label="Your Email Address" type="email" value={payerInfo.payerEmail} onChange={handlePayerChange} />
                <FormInput id="payerPhoneNumber" name="payerPhoneNumber" label="Your Phone Number" type="tel" value={payerInfo.payerPhoneNumber} onChange={handlePayerChange} />
            </div>
          )}
          {members.map((member, index) => currentStep === 3 + index && (
              <div key={member.id}>
                  <h4 className="text-lg font-bold text-brand-dark mb-4">Student {index + 1}: Details & Needs</h4>
                  <FormInput id={`fullName-${member.id}`} name="fullName" label="Full Name" value={member.fullName || ''} onChange={(e) => handleMemberChange(member.id!, e)} />
                  <FormSelect id={`gender-${member.id}`} name="gender" label="Gender" value={member.gender || ''} onChange={(e) => handleMemberChange(member.id!, e)} options={[{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}]} />
                  <FormTextArea id={`primaryGoals-${member.id}`} name="primaryGoals" label="Primary Goals" value={member.primaryGoals || ''} onChange={(e) => handleMemberChange(member.id!, e)} />
              </div>
          ))}
          {currentStep === 2 + members.length + 1 && (
              <div>
                  <h4 className="text-lg font-bold text-brand-dark mb-4">Final Step: Consent</h4>
                  <FormCheckbox id="consentToCommunications" name="consentToCommunications" label="I consent to receiving communications for all registered members." checked={consent.consentToCommunications} onChange={handleConsentChange} />
                  <FormInput id="signature" name="signature" label="Signature (Payer&apos;s Full Name)" value={consent.signature} onChange={handleConsentChange} />
              </div>
          )}
          {error && <p className="text-red-500 text-sm text-center my-4">{error}</p>}
          <div className="flex justify-between mt-8">
              <button type="button" onClick={prevStep} className={`...`} disabled={currentStep <= 1}>Back</button>
              <button type="submit" className={`...`} disabled={isSubmitting}>{isSubmitting ? 'Processing...' : (currentStep === totalSteps ? 'Proceed to Payment' : 'Next')}</button>
          </div>
      </form>
    </div>
  );
};