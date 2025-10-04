'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { FamilyMember } from '@/types';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';

// --- Reusable & Typed Form Components ---
interface FormTextAreaProps { id: string; name: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; required?: boolean; rows?: number; }
const FormTextArea: React.FC<FormTextAreaProps> = ({ id, name, label, value, onChange, required = true, rows = 4 }) => ( <div className="mb-4"><label htmlFor={id} className="block text-sm font-medium text-brand-dark/80 mb-1">{label}</label><textarea id={id} name={name} value={value} onChange={onChange} required={required} rows={rows} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"></textarea></div>);

interface FamilyMemberSubsequentFormProps {
  memberNumber: number; // e.g., 2, 3, etc.
  onDataChange: (data: Partial<FamilyMember>) => void;
  onValidationChange: (isValid: boolean) => void;
}

export const FamilyMemberSubsequentForm: React.FC<FamilyMemberSubsequentFormProps> = ({ memberNumber, onDataChange, onValidationChange }) => {
  // This component manages its own internal state for this specific member's data
  const [memberData, setMemberData] = useState<Partial<FamilyMember>>({
    fullName: '', // Also collect name for clarity
    gender: '',   // and gender
    primaryGoals: '', 
    quranicKnowledgeLevel: '', 
    attendedVirtualClasses: '', 
    personalChallenges: '', 
    supportExpectations: '', 
    hoursPerWeek: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedData = { ...memberData, [name]: value };
    setMemberData(updatedData);
    onDataChange(updatedData); // Pass data up to the parent orchestrator on every change
  };

  // Validation logic specific to this simplified form
  const isFormValid = useMemo(() => {
    return !!(memberData.fullName && memberData.gender && memberData.primaryGoals && memberData.quranicKnowledgeLevel && memberData.hoursPerWeek);
  }, [memberData]);
  
  // Inform the parent orchestrator if this component's data is valid
  useEffect(() => {
    onValidationChange(isFormValid);
  }, [isFormValid, onValidationChange]);

  return (
    <div className="border border-gray-200 p-6 rounded-lg bg-gray-50">
      <h4 className="text-xl font-bold text-brand-dark mb-4">Family Member {memberNumber}: Details & Needs</h4>
      
      <div>
          <FormInput id={`fullName-member-${memberNumber}`} name="fullName" label="Full Name" value={memberData.fullName || ''} onChange={handleChange} />
          <FormSelect id={`gender-member-${memberNumber}`} name="gender" label="Gender" value={memberData.gender || ''} onChange={handleChange} options={[{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}]} />
          <FormTextArea id={`primaryGoals-member-${memberNumber}`} name="primaryGoals" label="Primary goals for joining?" value={memberData.primaryGoals || ''} onChange={handleChange} />
          <FormSelect id={`quranicKnowledgeLevel-member-${memberNumber}`} name="quranicKnowledgeLevel" label="Current Qur'anic Knowledge Level" value={memberData.quranicKnowledgeLevel || ''} onChange={handleChange} options={[{value: 'Beginner', label: 'Beginner'}, {value: 'Intermediate', label: 'Intermediate'}, {value: 'Advanced', label: 'Advanced'}]} />
          <FormTextArea id={`personalChallenges-member-${memberNumber}`} name="personalChallenges" label="Any personal challenges in learning?" value={memberData.personalChallenges || ''} onChange={handleChange} />
          <FormTextArea id={`supportExpectations-member-${memberNumber}`} name="supportExpectations" label="Expectations from us for support?" value={memberData.supportExpectations || ''} onChange={handleChange} />
          <FormInput id={`hoursPerWeek-member-${memberNumber}`} name="hoursPerWeek" label="Hours per week they can dedicate?" type="number" value={memberData.hoursPerWeek || ''} onChange={handleChange} />
      </div>

      {/* This component does not have its own navigation buttons. */}
      {/* The parent 'FamilyFormFlow' handles the Next/Back logic. */}
    </div>
  );
};