"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FormRenderer } from "@/components/form-builder/FormRenderer";
import type { FormSchema } from "@/components/form-builder/FormBuilder";
import { useDraftRegistration } from "@/hooks/useDraftRegistration";

declare const FlutterwaveCheckout: any;

type Program = { id: number; title: string; slug: string };
type Plan = { id: number; plan_type: 'individual'|'family'; family_size: number|null; price: number; currency: string; duration_months: number };

enum Step { LOADING = 'LOADING', AUTH_REQUIRED = 'AUTH_REQUIRED', SELECT_PLAN = 'SELECT_PLAN', FORM_HEAD = 'FORM_HEAD', FORM_MEMBERS = 'FORM_MEMBERS', PAYMENT = 'PAYMENT', SUCCESS = 'SUCCESS', ERROR = 'ERROR' }

export default function EnrollPage() {
  const [step, setStep] = useState<Step>(Step.LOADING);
  const [programSlug, setProgramSlug] = useState<string>('');
  const [program, setProgram] = useState<Program | null>(null);
  const [user, setUser] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedType, setSelectedType] = useState<'individual' | 'family'>('individual');
  const [familySize, setFamilySize] = useState<number>(2);
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [memberFormSchema, setMemberFormSchema] = useState<FormSchema | null>(null);
  const [headFormData, setHeadFormData] = useState<Record<string, unknown>>({});
  const [memberFormData, setMemberFormData] = useState<Record<string, unknown>[]>([]);
  const [remainingMembers, setRemainingMembers] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Draft registration management
  const draftHook = useDraftRegistration({
    programId: program?.id?.toString() || '',
    registrationType: selectedType === 'family' ? 'family_head' : 'individual',
    autoSaveDelay: 5000, // 5 seconds
  });

  // Get program slug from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('program') || '';
      setProgramSlug(slug);
    }
  }, []);

  // Initialize everything
  useEffect(() => {
    if (!programSlug) return;
    
    const init = async () => {
      try {
        setStep(Step.LOADING);
        setMessage('Initializing...');

        // Check authentication
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!userData.user || userError) {
          console.log('User not authenticated, redirecting to login');
          window.location.href = `/login?next=${encodeURIComponent(`/enroll?program=${programSlug}`)}`;
          return;
        }
        setUser(userData.user);

        // Get program
        const { data: prog, error: progError } = await supabase
          .from('programs')
          .select('id, title, slug')
          .eq('slug', programSlug)
          .single();

        if (!prog || progError) {
          setStep(Step.ERROR);
          setMessage(`Program "${programSlug}" not found.`);
          return;
        }
        setProgram(prog);

        // Get plans
        const { data: planRows, error: plansError } = await supabase
          .from('program_plans')
          .select('*')
          .eq('program_id', prog.id);

        if (!planRows || planRows.length === 0 || plansError) {
          setStep(Step.ERROR);
          setMessage('No pricing plans available for this program.');
          return;
        }

        const formattedPlans: Plan[] = planRows.map((r: any) => ({
          id: r.id,
          plan_type: r.plan_type,
          family_size: r.family_size,
          price: Number(r.price),
          currency: r.currency,
          duration_months: r.duration_months
        }));
        setPlans(formattedPlans);

        // Check if forms exist
        const { count: formsCount, error: formsError } = await supabase
          .from('program_forms')
          .select('id', { count: 'exact' })
          .eq('program_id', prog.id);

        if (!formsCount || formsCount === 0 || formsError) {
          setStep(Step.ERROR);
          setMessage('Registration forms are not configured for this program yet.');
          return;
        }

        // All good, go to plan selection
        setStep(Step.SELECT_PLAN);
        setMessage('');

      } catch (error: any) {
        console.error('Enrollment initialization error:', error);
        setStep(Step.ERROR);
        setMessage(error.message || 'Failed to initialize enrollment');
      }
    };

    init();
  }, [programSlug]);

  // Load form schemas when plan type changes or step changes
  useEffect(() => {
    if (!program || (step !== Step.FORM_HEAD && step !== Step.FORM_MEMBERS)) return;

    const loadForms = async () => {
      try {
        setLoading(true);
        
        if (selectedType === 'individual') {
          // Load individual form
          const { data: formRow, error } = await supabase
            .from('program_forms')
            .select('schema')
            .eq('program_id', program.id)
            .eq('form_type', 'individual')
            .single();

          if (error || !formRow?.schema) {
            setMessage('Individual registration form not found for this program.');
            setStep(Step.SELECT_PLAN);
            return;
          }

          setFormSchema(formRow.schema as FormSchema);
          setMemberFormSchema(null);
        } else {
          // Load both family head and family member forms
          const [headResult, memberResult] = await Promise.all([
            supabase
              .from('program_forms')
              .select('schema')
              .eq('program_id', program.id)
              .eq('form_type', 'family_head')
              .single(),
            supabase
              .from('program_forms')
              .select('schema')
              .eq('program_id', program.id)
              .eq('form_type', 'family_member')
              .single()
          ]);

          if (headResult.error || !headResult.data?.schema) {
            setMessage('Family head registration form not found for this program.');
            setStep(Step.SELECT_PLAN);
            return;
          }

          if (memberResult.error || !memberResult.data?.schema) {
            setMessage('Family member registration form not found for this program.');
            setStep(Step.SELECT_PLAN);
            return;
          }

          setFormSchema(headResult.data.schema as FormSchema);
          setMemberFormSchema(memberResult.data.schema as FormSchema);
        }

        setMessage('');
      } catch (error: any) {
        console.error('Error loading forms:', error);
        setMessage('Failed to load registration forms');
        setStep(Step.SELECT_PLAN);
      } finally {
        setLoading(false);
      }
    };

    loadForms();
  }, [program, selectedType, step]);

  const selectedPlan = plans.find(p => {
    if (selectedType === 'individual') {
      return p.plan_type === 'individual' && p.family_size === null;
    } else {
      return p.plan_type === 'family' && p.family_size === familySize;
    }
  });

  const familySizeOptions = plans
    .filter(p => p.plan_type === 'family' && p.family_size)
    .map(p => p.family_size as number)
    .filter((size, index, arr) => arr.indexOf(size) === index)
    .sort((a, b) => a - b);

  const proceedToForm = () => {
    if (!selectedPlan) {
      setMessage('Please select a plan first');
      return;
    }
    
    // Reset form data
    setHeadFormData({});
    setMemberFormData([]);
    
    if (selectedType === 'family') {
      setRemainingMembers(familySize - 1); // Exclude the head
      setStep(Step.FORM_HEAD);
    } else {
      setStep(Step.FORM_HEAD); // Use same step for individual
    }
  };

  const handleHeadFormSubmit = async (formData: Record<string, unknown>) => {
    setHeadFormData(formData);
    
    if (selectedType === 'individual') {
      // For individual, proceed directly to payment
      await processRegistration(formData, []);
    } else {
      // For family, proceed to member forms
      setStep(Step.FORM_MEMBERS);
    }
  };

  const handleMemberFormSubmit = async (formData: Record<string, unknown>) => {
    const updatedMemberData = [...memberFormData, formData];
    setMemberFormData(updatedMemberData);
    
    const newRemainingMembers = remainingMembers - 1;
    setRemainingMembers(newRemainingMembers);
    
    if (newRemainingMembers > 0) {
      // More members to collect, stay on member form step but show progress
      setMessage(`Member ${familySize - newRemainingMembers} of ${familySize - 1} completed. Please continue with the next family member.`);
      // The key prop in FormRenderer will handle re-rendering
    } else {
      // All members collected, proceed to payment
      setMessage('All family members registered! Processing...');
      await processRegistration(headFormData, updatedMemberData);
    }
  };

  const processRegistration = async (headData: Record<string, unknown>, memberData: Record<string, unknown>[]) => {
    if (!user || !program || !selectedPlan) {
      setMessage('Missing required information');
      return;
    }

    try {
      setLoading(true);
      setMessage('Processing registration...');

      // Use existing draft row if present; otherwise insert a new enrollment
      let enrollmentId: number | null = null;
      if (draftHook.draftId) {
        const draftIdNum = Number(draftHook.draftId);
        const { error: updErr } = await supabase
          .from('enrollments')
          .update({
            user_id: user.id,
            program_id: program.id,
            is_family: selectedType === 'family',
            family_size: selectedType === 'family' ? familySize : null,
            status: 'submitted',
            payment_status: 'unpaid',
            plan_id: selectedPlan.id,
            duration_months: selectedPlan.duration_months,
            form_data: { head: headData, members: memberData },
            is_draft: false,
            last_edited_at: new Date().toISOString(),
          })
          .eq('id', draftIdNum);
        if (updErr) throw updErr;
        enrollmentId = draftIdNum;
      } else {
        const { data: enrollment, error: enrollError } = await supabase
          .from('enrollments')
          .insert({
            user_id: user.id,
            program_id: program.id,
            is_family: selectedType === 'family',
            family_size: selectedType === 'family' ? familySize : null,
            status: 'submitted',
            payment_status: 'unpaid',
            plan_id: selectedPlan.id,
            duration_months: selectedPlan.duration_months,
            form_data: { head: headData, members: memberData }
          })
          .select('id')
          .single();
        if (enrollError || !enrollment) {
          throw new Error(enrollError?.message || 'Failed to create enrollment');
        }
        enrollmentId = enrollment.id as number;
      }

      // Initiate payment
      setMessage('Redirecting to payment...');
      FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
        tx_ref: String(enrollmentId),
        amount: selectedPlan.price,
        currency: selectedPlan.currency || 'NGN',
        redirect_url: `/payment-success?ref=${enrollmentId}`,
        customer: { 
          email: user.email, 
          name: user.email?.split('@')[0] || 'Student' 
        },
        customizations: { 
          title: 'Mubeen Academy', 
          description: `Payment for ${program.title}`, 
          logo: '/logo.png' 
        },
        onclose: () => {
          setMessage('Payment cancelled');
        }
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      setMessage(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case Step.LOADING:
        return (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{message || 'Loading...'}</p>
          </div>
        );

      case Step.ERROR:
        return (
          <div className="text-center py-12">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Enrollment Not Available</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <a href="/programs" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700">
              Back to Programs
            </a>
          </div>
        );

      case Step.SELECT_PLAN:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">Select Your Plan</h2>
            {program && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900">Enrolling in: {program.title}</h3>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Plan Type Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Plan Type</label>
                <div className="flex gap-4">
                  <button
                    className={`px-4 py-2 rounded-md ${selectedType === 'individual' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setSelectedType('individual')}
                  >
                    Individual
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md ${selectedType === 'family' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setSelectedType('family')}
                  >
                    Family
                  </button>
                </div>
              </div>

              {/* Family Size Selection */}
              {selectedType === 'family' && familySizeOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2" htmlFor="familySizeSelect">Family Size</label>
                  <select 
                    id="familySizeSelect"
                    value={familySize} 
                    onChange={(e) => setFamilySize(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {familySizeOptions.map(size => (
                      <option key={size} value={size}>Family of {size}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Plan Details */}
              {selectedPlan && (
                <div className="p-4 border border-gray-300 rounded-lg bg-green-50">
                  <h4 className="font-semibold mb-2">Selected Plan</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Type:</strong> {selectedType === 'individual' ? 'Individual' : `Family of ${familySize}`}</p>
                    <p><strong>Price:</strong> {selectedPlan.currency} {selectedPlan.price.toLocaleString()}</p>
                    <p><strong>Duration:</strong> {selectedPlan.duration_months} months</p>
                  </div>
                </div>
              )}

              {message && (
                <div className="text-red-600 text-sm">{message}</div>
              )}

              <button
                onClick={proceedToForm}
                disabled={!selectedPlan}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Continue to Registration Form
              </button>
            </div>
          </div>
        );

      case Step.FORM_HEAD:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">
              {selectedType === 'individual' ? 'Registration Form' : 'Family Head Information'}
            </h2>
            {selectedPlan && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  Plan: {selectedType === 'individual' ? 'Individual' : `Family of ${familySize}`} - 
                  {selectedPlan.currency} {selectedPlan.price.toLocaleString()}
                </p>
              </div>
            )}
            
            {loading && (
              <div className="text-center py-4">
                <p className="text-gray-600">Loading form...</p>
              </div>
            )}

            {formSchema && !loading && (
              <>
                <FormRenderer 
                  key={`${program?.id ?? 'p'}-${selectedType}-${draftHook.draftId ?? draftHook.lastSaved ?? 'none'}`}
                  schema={formSchema} 
                  onSubmit={handleHeadFormSubmit}
                  disabled={loading}
                  initialValues={draftHook.formData as Record<string, any>}
                  onChange={(data) => {
                    Object.entries(data).forEach(([k, v]) => draftHook.updateFormData(k, v as any));
                  }}
                />
                
                {/* Save Draft Section */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">Save Progress</h4>
                      <p className="text-sm text-gray-600">
                        {draftHook.lastSaved ? (
                          `Last saved: ${draftHook.lastSaved.toLocaleTimeString()}`
                        ) : (
                          'Your progress will be automatically saved'
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {draftHook.isSaving && (
                        <span className="text-sm text-blue-600">Saving...</span>
                      )}
                      <button
                        type="button"
                        onClick={draftHook.saveDraft}
                        disabled={draftHook.isSaving}
                        className="btn-outline text-sm"
                      >
                        Save & Continue Later
                      </button>
                    </div>
                  </div>
                  {draftHook.hasUnsavedChanges && (
                    <div className="text-xs text-amber-600">
                      ⚠️ You have unsaved changes
                    </div>
                  )}
                </div>
              </>
            )}

            {message && (
              <div className="mt-4 text-center text-red-600">{message}</div>
            )}

            <button
              onClick={() => setStep(Step.SELECT_PLAN)}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              ← Back to Plan Selection
            </button>
          </div>
        );

      case Step.FORM_MEMBERS:
        const currentMemberNumber = familySize - remainingMembers;
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">Family Member Information</h2>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-semibold">
                Registering Member {currentMemberNumber} of {familySize - 1}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {remainingMembers > 1 ? `${remainingMembers} members remaining after this one.` : 'This is the last family member to register.'}
              </p>
              {memberFormData.length > 0 && (
                <div className="mt-2 text-xs text-green-600">
                  ✓ {memberFormData.length} member{memberFormData.length !== 1 ? 's' : ''} completed
                </div>
              )}
            </div>
            
            {loading && (
              <div className="text-center py-4">
                <p className="text-gray-600">Loading form...</p>
              </div>
            )}

            {memberFormSchema && !loading && (
              <FormRenderer 
                key={`member-${currentMemberNumber}`} // Force re-render for each member
                schema={{
                  ...memberFormSchema,
                  title: `${memberFormSchema.title} - Member ${currentMemberNumber}`,
                  description: `Please provide information for family member ${currentMemberNumber}${memberFormData.length > 0 ? ` (${memberFormData.length} already completed)` : ''}.`
                }}
                onSubmit={handleMemberFormSubmit}
                disabled={loading}
              />
            )}

            {message && (
              <div className="mt-4 text-center text-red-600">{message}</div>
            )}

            <button
              onClick={() => setStep(Step.FORM_HEAD)}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              ← Back to Family Head
            </button>
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Program Enrollment</h1>
            <p className="text-gray-600 mt-2">Complete your registration to join the program</p>
          </div>
          
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
