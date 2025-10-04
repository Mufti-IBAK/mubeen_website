'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { FamilyMember, Plan, Program } from '@/types';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { supabase } from '@/lib/supabaseClient';

// --- Reusable & Typed Form Components ---
interface FormTextAreaProps { id: string; name: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; required?: boolean; rows?: number; }
const FormTextArea: React.FC<FormTextAreaProps> = ({ id, name, label, value, onChange, required = true, rows = 4 }) => (
    <div className="mb-4"><label htmlFor={id} className="block text-sm font-medium text-brand-dark/80 mb-1">{label}</label><textarea id={id} name={name} value={value} onChange={onChange} required={required} rows={rows} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"></textarea></div>
);

// Progress bar removed per requirements

interface FamilyMemberOneFormProps {
  onDataChange: (data: Partial<FamilyMember>) => void;
  onValidationChange: (isValid: boolean) => void;
}

export const FamilyMemberOneForm: React.FC<FamilyMemberOneFormProps> = ({ onDataChange, onValidationChange }) => {
  // This component manages its own internal state for Member 1's data
  const [memberData, setMemberData] = useState<Partial<FamilyMember>>({
    fullName: '', gender: '', dateOfBirth: '', guardianName: '', phoneNumber: '', email: '', address: '', communicationMode: '', emergencyContact: '',
    primaryGoals: '', quranicKnowledgeLevel: '', attendedVirtualClasses: '', personalChallenges: '', supportExpectations: '', hoursPerWeek: '',
    // Note: Payment and consent fields are not part of the individual member's data
  });

  const [currentSection, setCurrentSection] = useState(1);
  const totalSections = 3; // Section 1: Personal, Section 2: Program Details (pre-filled), Section 3: Learning Needs

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedData = { ...memberData, [name]: value };
    setMemberData(updatedData);
    onDataChange(updatedData);
  };
  
  const isSectionValid = useMemo(() => {
    switch (currentSection) {
      case 1: return !!(memberData.fullName && memberData.gender && memberData.dateOfBirth && memberData.phoneNumber && memberData.email && memberData.address && memberData.communicationMode && memberData.emergencyContact);
      case 2: // Section 2 is informational for family plan, no new fields to validate here.
        return true;
      case 3: return !!(memberData.primaryGoals && memberData.quranicKnowledgeLevel && memberData.attendedVirtualClasses && memberData.hoursPerWeek && memberData.supportExpectations && memberData.personalChallenges);
      default: return false;
    }
  }, [memberData, currentSection]);
  
  useEffect(() => {
    // This component is "complete" when the user is on the final section and it's valid.
    const isFormCompleteAndValid = currentSection === totalSections && isSectionValid;
    onValidationChange(isFormCompleteAndValid);
  }, [isSectionValid, currentSection, onValidationChange, totalSections]);

  const nextSection = () => setCurrentSection(prev => Math.min(prev + 1, totalSections));
  const prevSection = () => setCurrentSection(prev => Math.max(prev - 1, 1));

  return (
    <div className="border border-gray-200 p-6 rounded-lg bg-gray-50">
      <h4 className="text-xl font-bold text-brand-dark mb-4">Family Member 1: Comprehensive Registration</h4>
      
      {currentSection === 1 && (
          <div>
              <h5 className="font-semibold text-brand-dark mb-3">Section 1: Personal Information</h5>
              <FormInput id="fullName" name="fullName" label="Full Name" value={memberData.fullName || ''} onChange={handleChange} />
              <FormSelect id="gender" name="gender" label="Gender" value={memberData.gender || ''} onChange={handleChange} options={[{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}]} />
              <FormInput id="dateOfBirth" name="dateOfBirth" label="Date of Birth" type="date" value={memberData.dateOfBirth || ''} onChange={handleChange} />
              <FormInput id="guardianName" name="guardianName" label="Parent/Guardian Name (if applicable)" value={memberData.guardianName || ''} onChange={handleChange} required={false} />
              <FormInput id="phoneNumber" name="phoneNumber" label="Phone Number (WhatsApp Preferred)" type="tel" value={memberData.phoneNumber || ''} onChange={handleChange} />
              <FormInput id="email" name="email" label="Email Address" type="email" value={memberData.email || ''} onChange={handleChange} />
              <FormTextArea id="address" name="address" label="Residential Address (State & Country)" value={memberData.address || ''} onChange={handleChange} />
              <FormSelect id="communicationMode" name="communicationMode" label="Preferred Mode of Communication" value={memberData.communicationMode || ''} onChange={handleChange} options={[{value: 'WhatsApp', label: 'WhatsApp'}, {value: 'Email', label: 'Email'}, {value: 'Call', label: 'Call'}]} />
              <FormInput id="emergencyContact" name="emergencyContact" label="Emergency Contact Person & Number" value={memberData.emergencyContact || ''} onChange={handleChange} />
          </div>
      )}
      {currentSection === 2 && (
          <div>
              <h5 className="font-semibold text-brand-dark mb-3">Section 2: Program Details</h5>
              <p className="text-gray-600">The program details, category, and payment options have been pre-selected based on your family plan choices in the previous step.</p>
          </div>
      )}
      {currentSection === 3 && (
          <div>
              <h5 className="font-semibold text-brand-dark mb-3">Section 3: Learning Expectations</h5>
              <FormTextArea id="primaryGoals" name="primaryGoals" label="Primary goals for joining?" value={memberData.primaryGoals || ''} onChange={handleChange} />
              <FormSelect id="quranicKnowledgeLevel" name="quranicKnowledgeLevel" label="Current Qur'anic Knowledge Level" value={memberData.quranicKnowledgeLevel || ''} onChange={handleChange} options={[{value: 'Beginner', label: 'Beginner'}, {value: 'Intermediate', label: 'Intermediate'}, {value: 'Advanced', label: 'Advanced'}]} />
              <FormSelect id="attendedVirtualClasses" name="attendedVirtualClasses" label="Attended virtual classes before?" value={memberData.attendedVirtualClasses || ''} onChange={handleChange} options={[{value: 'Yes', label: 'Yes'}, {value: 'No', label: 'No'}]} />
              <FormTextArea id="personalChallenges" name="personalChallenges" label="Any personal challenges in learning?" value={memberData.personalChallenges || ''} onChange={handleChange} />
              <FormTextArea id="supportExpectations" name="supportExpectations" label="Expectations from us for support?" value={memberData.supportExpectations || ''} onChange={handleChange} />
              <FormInput id="hoursPerWeek" name="hoursPerWeek" label="Hours per week you can dedicate?" type="number" value={memberData.hoursPerWeek || ''} onChange={handleChange} />
          </div>
      )}

      <div className="flex justify-end mt-6 pt-4 border-t">
        <button type="button" onClick={prevSection} className="px-4 py-2 text-sm border border-gray-300 rounded-md font-semibold hover:bg-gray-50 disabled:opacity-50" disabled={currentSection <= 1}>
            Back Section
        </button>
        {currentSection < totalSections && (
          <button type="button" onClick={nextSection} className="px-4 py-2 text-sm bg-brand-primary text-white rounded-md font-semibold hover:bg-blue-600 disabled:opacity-50 ml-4" disabled={!isSectionValid}>
            Next Section
          </button>
        )}
      </div>
    </div>
  );
};

// --- Orchestrator: FamilyFormFlow ---
interface FamilyFormFlowProps {
  selectedProgram: Program | null;
  familyPlanDetails: Plan;
  onBack: () => void;
}

export const FamilyFormFlow: React.FC<FamilyFormFlowProps> = ({ selectedProgram, familyPlanDetails, onBack }) => {
  const [familySize, setFamilySize] = useState<string>('');
  const [payerFullName, setPayerFullName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhoneNumber, setPayerPhoneNumber] = useState('');

  const [isMemberOneValid, setIsMemberOneValid] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const totalSteps = 3; // 1: Plan & Payer, 2: Member 1, 3: Review & Submit

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      // For now, treat family registration as a prioritized inquiry for human follow-up.
      // This keeps the UX consistent and avoids partial data in production.
      const { error } = await supabase.from('program_inquiries').insert({
        full_name: payerFullName,
        email: payerEmail,
        phone_number: payerPhoneNumber,
        program_title: `${selectedProgram?.title || 'Selected Program'} (Family Plan - ${familySize || 'N/A'})`,
      });
      if (error) throw error;
      setMessage('Thank you! We received your family plan request. Our team will contact you shortly to finalize details and payment.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sizeOptions = (familyPlanDetails.family_size_options || []).map((o) => ({ value: o.size, label: o.size }));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-brand-dark">Family Registration</h3>
        <button onClick={onBack} className="text-sm text-gray-600 hover:text-brand-primary underline">Back to Plan Selection</button>
      </div>
      <div className="mb-4">
        <div className="text-sm text-gray-600">Program: <span className="font-semibold">{selectedProgram?.title}</span></div>
      </div>

      {message ? (
        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
          <p className="text-brand-dark/80">{message}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            {currentStep === 1 && (
              <div>
                <h4 className="text-lg font-bold text-brand-dark mb-4">Step 1: Select Family Size & Payer Details</h4>
                <FormSelect id="familySize" name="familySize" label="Family Size" value={familySize} onChange={(e) => setFamilySize(e.target.value)} options={sizeOptions} />
                <FormInput id="payerFullName" name="payerFullName" label="Payer Full Name" value={payerFullName} onChange={(e) => setPayerFullName(e.target.value)} />
                <FormInput id="payerEmail" name="payerEmail" label="Payer Email" type="email" value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} />
                <FormInput id="payerPhoneNumber" name="payerPhoneNumber" label="Payer Phone Number" type="tel" value={payerPhoneNumber} onChange={(e) => setPayerPhoneNumber(e.target.value)} />
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h4 className="text-lg font-bold text-brand-dark mb-4">Step 2: Family Member 1 Details</h4>
                <FamilyMemberOneForm onDataChange={() => { /* collected upstream if needed */ }} onValidationChange={setIsMemberOneValid} />
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h4 className="text-lg font-bold text-brand-dark mb-4">Step 3: Review & Submit</h4>
                <p className="text-sm text-brand-dark/70 mb-4">We will reach out to you to complete the family registration and payment based on the details below.</p>
                <div className="bg-gray-50 border rounded-lg p-4 text-sm space-y-2">
                  <div><span className="font-semibold">Program:</span> {selectedProgram?.title}</div>
                  <div><span className="font-semibold">Family Size:</span> {familySize || '—'}</div>
                  <div><span className="font-semibold">Payer:</span> {payerFullName} • {payerEmail} • {payerPhoneNumber}</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <button type="button" onClick={prevStep} className={`px-6 py-2 border border-gray-300 rounded-md font-semibold transition-colors ${currentStep <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`} disabled={currentStep <= 1}>Back</button>
            {currentStep < totalSteps ? (
              <button type="button" onClick={nextStep} className={`px-6 py-2 bg-brand-primary text-white rounded-md font-semibold transition-colors ${currentStep === 1 ? (!familySize || !payerFullName || !payerEmail || !payerPhoneNumber ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600') : (!isMemberOneValid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600')}`} disabled={currentStep === 1 ? (!familySize || !payerFullName || !payerEmail || !payerPhoneNumber) : (!isMemberOneValid)}>
                Next
              </button>
            ) : (
              <button type="submit" className={`px-6 py-2 bg-green-600 text-white rounded-md font-semibold transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
