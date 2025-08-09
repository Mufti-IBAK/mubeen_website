// Defines the structure for a single family member in the family plan
export interface FamilyMember {
  id: number;
  fullName: string;
  email: string;
  gender: 'Male' | 'Female' | '';
}

// Defines the structure for a registration plan (fetched from Supabase)
export interface Plan {
  id: number;
  program_slug: string;
  plan_type: 'individual' | 'family';
  title: string;
  price_per_month: number | null;
  price_per_semester: number | null;
  features: string[];
  family_size_options: { size: string; price: number }[] | null;
}

// The comprehensive master interface for the 24-Month Program Registration
export interface RegistrationFormData {
  // Plan Selection
  enrollmentType: 'individual' | 'family' | '';
  // Section 1: Personal Information
  fullName: string; gender: 'Male' | 'Female' | ''; dateOfBirth: string; guardianName: string; phoneNumber: string; email: string; address: string; communicationMode: 'WhatsApp' | 'Email' | 'Call' | ''; emergencyContact: string;
  // Section 2: Program & Payment Details
  category: 'Junior (1-3 Terms)' | 'Senior (4-6 Terms)' | ''; classType: 'Group Class' | 'Private Class' | ''; paymentOption: 'Full Subscription' | 'Installments' | ''; paymentMethod: 'Bank Transfer' | 'Mobile Transfer' | 'USSD' | 'Others' | ''; paymentMethodOther: string; paymentAssistance: 'Yes' | 'No' | '';
  // Section 3: Learning Expectations
  primaryGoals: string; quranicKnowledgeLevel: 'Beginner' | 'Intermediate' | 'Advanced' | ''; attendedVirtualClasses: 'Yes' | 'No' | ''; virtualClassChallenges: string[]; virtualClassChallengesOther: string; personalChallenges: string; supportExpectations: string; hoursPerWeek: string; sessionPreference: 'Live' | 'Recorded' | 'Both' | ''; extraMentorshipInterest: 'Yes' | 'No' | '';
  // Section 4: Consent & Declarations
  commitToDuration: boolean; consentToCommunications: boolean; understandRenewal: boolean; signature: string;
  // Family Plan Specific
  payerFullName: string; payerEmail: string; payerPhoneNumber: string; familyMembers: FamilyMember[];
}