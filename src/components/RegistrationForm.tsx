'use client';

import React, { useState } from 'react';
import { Plan, Program } from '@/types';
// FIX: Import the REAL components, not placeholders.
import { IndividualFormFlow } from './IndividualFormFlow';
import { FamilyFormFlow } from './FamilyFormFlow';
import { SimpleRegistrationForm } from './SimpleRegistrationForm';
import { DynamicRegistrationFlow } from './DynamicRegistrationFlow';

// --- Reusable PlanCard Component ---
const PlanCard: React.FC<{ plan: Plan; onSelect: () => void }> = ({ plan, onSelect }) => (
    <button onClick={onSelect} className="p-6 border-2 border-gray-200 rounded-lg text-left hover:border-brand-primary hover:bg-brand-primary/5 transition-all flex flex-col h-full">
        <h4 className="text-lg font-bold text-brand-dark">{plan.title}</h4>
        {plan.price_per_semester && <p className="text-2xl font-bold text-brand-primary mt-2">₦{plan.price_per_semester.toLocaleString()}<span className="text-sm font-normal text-gray-500">/semester</span></p>}
        {plan.price_per_month && <p className="text-md font-semibold text-gray-600">or ₦{plan.price_per_month.toLocaleString()}/month</p>}
        <ul className="flex-grow mt-4 space-y-2">
            {plan.features.map((feature: string) => (
                <li key={feature} className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                    {feature}
                </li>
            ))}
        </ul>
         {plan.family_size_options && (
            <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-bold text-gray-700">Family Pricing (Per Semester):</p>
                {plan.family_size_options.map(opt => (
                    opt.prices && <p key={opt.size} className="text-xs text-gray-600">{opt.size}: ₦{opt.prices.full.toLocaleString()}</p>
                ))}
            </div>
        )}
    </button>
);

interface RegistrationFormProps {
  selectedProgram: Program | null;
  availablePlans: Plan[];
  allPrograms?: { title: string; slug: string }[]; // optional for future switching UI
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ selectedProgram, availablePlans }) => {
  const [enrollmentType, setEnrollmentType] = useState<'individual' | 'family' | null>(null);

  const handlePlanSelect = (plan: 'individual' | 'family') => {
    setEnrollmentType(plan);
  };

  const handleBackToSelection = () => {
    setEnrollmentType(null);
  }

  const individualPlanDetails = availablePlans.find(p => p.plan_type === 'individual');
  const familyPlanDetails = availablePlans.find(p => p.plan_type === 'family');

  // If a dynamic course exists for this slug with configured forms, prefer dynamic registration
  if (selectedProgram?.slug) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl max-w-3xl mx-auto">
        <DynamicRegistrationFlow programSlug={selectedProgram.slug} />
      </div>
    );
  }

  // Fallbacks
  if (selectedProgram && !selectedProgram.is_flagship) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl max-w-3xl mx-auto">
        <SimpleRegistrationForm selectedProgram={selectedProgram} />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl max-w-4xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-brand-dark font-heading text-center mb-6">
        Register for {selectedProgram?.title || 'Our Program'}
      </h2>
      
      {/* If no plan is selected, show the plan cards */}
      {enrollmentType === null && (
        <div>
          <h3 className="text-xl font-semibold text-brand-dark mb-4 text-center">First, Choose Your Enrollment Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {individualPlanDetails && (
              <PlanCard 
                plan={individualPlanDetails}
                onSelect={() => handlePlanSelect('individual')}
              />
            )}
            {familyPlanDetails && (
              <PlanCard 
                plan={familyPlanDetails}
                onSelect={() => handlePlanSelect('family')}
              />
            )}
          </div>
        </div>
      )}

      {/* If 'individual' is selected, render the REAL Individual Form Flow */}
      {enrollmentType === 'individual' && (
        <IndividualFormFlow 
          selectedProgram={selectedProgram}
          onBack={handleBackToSelection}
        />
      )}

      {/* If 'family' is selected, render the REAL Family Form Flow */}
      {enrollmentType === 'family' && familyPlanDetails && (
        <FamilyFormFlow 
          selectedProgram={selectedProgram}
          familyPlanDetails={familyPlanDetails}
          onBack={handleBackToSelection}
        />
      )}
    </div>
  );
};