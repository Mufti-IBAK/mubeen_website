'use client';

import React, { useState, useMemo } from 'react';
import { RegistrationFormData, Plan } from '@/types';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { FormCheckbox } from './FormCheckbox';
import { Program } from './ProgramCard';
import { supabase } from '@/lib/supabaseClient';

// --- Reusable Form Components (unchanged) ---
interface FormTextAreaProps { id: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; required?: boolean; rows?: number; }
const FormTextArea: React.FC<FormTextAreaProps> = ({ id, label, value, onChange, required = true, rows = 4 }) => ( <div className="mb-4"><label htmlFor={id} className="block text-sm font-medium text-brand-dark/80 mb-1">{label}</label><textarea id={id} name={id} value={value} onChange={onChange} required={required} rows={rows} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"></textarea></div> );
const PlanCard: React.FC<{ plan: Plan; onSelect: () => void }> = ({ plan, onSelect }) => ( <button onClick={onSelect} className="p-6 border-2 border-gray-200 rounded-lg text-left hover:border-brand-primary hover:bg-brand-primary/5 transition-all flex flex-col h-full"><h4 className="text-lg font-bold text-brand-dark">{plan.title}</h4>{plan.price_per_semester && <p className="text-2xl font-bold text-brand-primary mt-2">₦{plan.price_per_semester.toLocaleString()}<span className="text-sm font-normal text-gray-500">/semester</span></p>}{plan.price_per_month && <p className="text-md font-semibold text-gray-600">or ₦{plan.price_per_month.toLocaleString()}/month</p>}<ul className="flex-grow mt-4 space-y-2">{plan.features.map((feature: string) => (<li key={feature} className="flex items-center text-sm text-gray-600"><svg className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>{feature}</li>))}</ul></button> );
const ProgressBar = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => { const progress = currentStep > 0 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0; return (<div className="w-full bg-gray-200 rounded-full h-2.5 mb-8"><div className="bg-brand-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>); };

// Declare the FlutterwaveCheckout function from the SDK to satisfy TypeScript
declare const FlutterwaveCheckout: any;

interface RegistrationFormProps {
  selectedProgram: Program | null;
  availablePlans: Plan[];
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ selectedProgram, availablePlans }) => {
  const [formData, setFormData] = useState<RegistrationFormData>({
    enrollmentType: '', fullName: '', gender: '', dateOfBirth: '', guardianName: '', phoneNumber: '', email: '', address: '', communicationMode: '', emergencyContact: '',
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
    if (type === 'checkbox') { const { checked } = e.target as HTMLInputElement; setFormData(prev => ({ ...prev, [name]: checked })); } 
    else { setFormData(prev => ({ ...prev, [name]: value })); }
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

  const handlePlanSelect = (plan: 'individual' | 'family') => { setFormData(prev => ({ ...prev, enrollmentType: plan })); setCurrentStep(1); };
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepValid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // Step 1: Save registration data to Supabase (unchanged)
      const { data, error: supabaseError } = await supabase.from('registrations').insert({ /* ... form data mapping ... */ }).select().single();
      if (supabaseError) throw supabaseError;
      if (!data) throw new Error("Failed to create registration record.");

      // FIX: Step 2: Initialize Flutterwave Payment
      FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY!,
        tx_ref: data.id, // CRITICAL: Use our database ID as the transaction reference
        amount: 20000, // TODO: Make dynamic
        currency: "NGN",
        payment_options: "card, banktransfer, ussd",
        redirect_url: `/payment-success`, // A fallback redirect URL
        customer: {
          email: formData.email,
          phone_number: formData.phoneNumber,
          name: formData.fullName,
        },
        customizations: {
          title: "Mubeen Academy",
          description: `Payment for ${selectedProgram?.title}`,
          logo: "https://www.mubeenacademy.com/logo.png", // IMPORTANT: Replace with your actual deployed logo URL
        },
        callback: function (data: any) {
          console.log("Flutterwave transaction successful:", data);
          // The webhook is the source of truth, but we can close the modal here.
          // The redirect_url will handle the next step.
        },
        onclose: function() {
          console.log('Payment modal closed.');
          setIsSubmitting(false); // Re-enable the form
        },
      });

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      console.error("Submission Error:", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl max-w-2xl mx-auto">
      {/* ... All Form UI and Navigation is exactly the same ... */}
    </div>
  );
};
```*Note: The unchanged UI and logic are omitted for brevity but are part of the full file.*

---

### **Part 3: The New, Secure Flutterwave Webhook**

Finally, we'll create the new webhook listener specifically for Flutterwave.

*   Here is the **full code** for **`src/app/api/flutterwave-webhook/route.ts`**.

**Create file:** `src/app/api/flutterwave-webhook/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    // 1. SECURITY CHECK: Verify the webhook signature to ensure it's from Flutterwave
    const flutterwaveSignature = req.headers.get('verif-hash');
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;

    if (!secretHash) {
      console.error("CRITICAL: Flutterwave secret hash is not set.");
      return new NextResponse('Internal server configuration error', { status: 500 });
    }

    // If a secret hash is set, we must verify it.
    if (flutterwaveSignature !== secretHash) {
      console.warn("Invalid Flutterwave signature received.");
      return new NextResponse('Invalid signature', { status: 401 });
    }

    // 2. PROCESS THE VALIDATED DATA
    const eventData = await req.json();

    // We are interested in successful charge events
    if (eventData.event === "charge.completed" && eventData.data.status === "successful") {
      const { tx_ref, status } = eventData.data;

      // 3. UPDATE THE DATABASE
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ payment_status: 'paid' })
        .eq('id', tx_ref); // The 'id' is our transaction reference (tx_ref)

      if (updateError) {
        console.error(`Failed to update payment status for registration ref: ${tx_ref}`, updateError);
      } else {
        console.log(`Successfully updated payment status to 'paid' for registration: ${tx_ref}`);
      }
    }
    
    // 4. RESPOND TO FLUTTERWAVE
    return new NextResponse('Webhook processed successfully', { status: 200 });

  } catch (error) {
    console.error("Error in Flutterwave webhook:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}