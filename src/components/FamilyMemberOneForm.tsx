'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { FamilyMember } from '@/types';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';


// --- Reusable & Typed Form Components ---
interface FormTextAreaProps { id: string; name: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; required?: boolean; rows?: number; }
const FormTextArea: React.FC<FormTextAreaProps> = ({ id, name, label, value, onChange, required = true, rows = 4 }) => ( <div className="mb-4"><label htmlFor={id} className="block text-sm font-medium text-brand-dark/80 mb-1">{label}</label><textarea id={id} name={name} value={value} onChange={onChange} required={required} rows={rows} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"></textarea></div>);
// Progress bar removed per requirements

interface FamilyMemberOneFormProps {
  onDataChange: (data: Partial<FamilyMember>) => void;
  onValidationChange: (isValid: boolean) => void; // Used to enable/disable the 'Next' button in the parent
}

export const FamilyMemberOneForm: React.FC<FamilyMemberOneFormProps> = ({ onDataChange, onValidationChange }) => {
  const [memberData, setMemberData] = useState<Partial<FamilyMember>>({
    fullName: '', gender: '', dateOfBirth: '', guardianName: '', phoneNumber: '', email: '', address: '', communicationMode: '', emergencyContact: '',
    primaryGoals: '', quranicKnowledgeLevel: '', attendedVirtualClasses: '', personalChallenges: '', supportExpectations: '', hoursPerWeek: '',
  });
  
  // Note: The fields for sections 2 and 4 are not part of the FamilyMember type.
  // They are handled by the parent FamilyFormFlow component. This form only collects member data.
  // We will create local state for any temporary data if needed, but for this structure, it's not.

  const [currentSection, setCurrentSection] = useState(1);
  const totalSections = 2; // This form is responsible for Personal Info and Learning Needs only.

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedData = { ...memberData, [name]: value };
    setMemberData(updatedData);
    onDataChange(updatedData);
  };
  
  const isSectionValid = useMemo(() => {
    if (currentSection === 1) { // Personal Info Validation
      return !!(memberData.fullName && memberData.gender && memberData.dateOfBirth && memberData.phoneNumber && memberData.email && memberData.address && memberData.communicationMode && memberData.emergencyContact);
    }
    if (currentSection === 2) { // Learning Needs Validation
      return !!(memberData.primaryGoals && memberData.quranicKnowledgeLevel && memberData.attendedVirtualClasses && memberData.hoursPerWeek && memberData.supportExpectations && memberData.personalChallenges);
    }
    return false;
  }, [memberData, currentSection]);
  
  useEffect(() => {
    // This component is considered "fully valid" only when the user is on the last section and that section is valid.
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
              <h5 className="font-semibold text-brand-dark mb-3">Part A: Personal Information</h5>
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
              <h5 className="font-semibold text-brand-dark mb-3">Part B: Learning Needs</h5>
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