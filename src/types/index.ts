// This file is the single source of truth for our data shapes.

export interface Program {
  id: number;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  tags: string[] | null;
  duration: string;
  is_flagship: boolean;
}

export interface Plan {
  id: number;
  program_slug: string;
  plan_type: 'individual' | 'family';
  title: string;
  price_per_month: number | null;
  price_per_semester: number | null;
  features: string[];
  family_size_options: { 
    size: string; 
    prices: { full: number; term: number; installment: number } | null;
    enrollment_types: string[];
  }[] | null;
}

// FIX: This is the complete and correct interface with all fields
export interface RegistrationFormData {
  // Plan Selection
  enrollmentType: 'individual' | 'family' | '';
  familySize: string;

  // Section 1: Personal Information
  fullName: string;
  gender: 'Male' | 'Female' | '';
  dateOfBirth: string;
  guardianName: string;
  phoneNumber: string;
  email: string;
  address: string;
  communicationMode: 'WhatsApp' | 'Email' | 'Call' | '';
  emergencyContact: string;

  // Section 2: Program & Payment
  category: 'Junior (1-3 Terms)' | 'Senior (4-6 Terms)' | '';
  classType: 'Group Class' | 'Private Class' | '';
  paymentOption: string;
  paymentMethod: 'Bank Transfer' | 'Mobile Transfer' | 'USSD' | 'Others' | '';
  paymentMethodOther: string;
  paymentAssistance: 'Yes' | 'No' | '';
  
  // Section 3: Learning Expectations
  primaryGoals: string;
  quranicKnowledgeLevel: 'Beginner' | 'Intermediate' | 'Advanced' | '';
  attendedVirtualClasses: 'Yes' | 'No' | '';
  virtualClassChallenges: string[];
  virtualClassChallengesOther: string;
  personalChallenges: string;
  supportExpectations: string;
  hoursPerWeek: string;
  sessionPreference: 'Live' | 'Recorded' | 'Both' | '';
  extraMentorshipInterest: 'Yes' | 'No' | '';

  // Section 4: Consent
  commitToDuration: boolean;
  consentToCommunications: boolean;
  understandRenewal: boolean;
  signature: string;

  // Family Plan Specific
  payerFullName: string;
  payerEmail: string;
  payerPhoneNumber: string;
  familyMembers: FamilyMember[];
}

// Defines a single family member for the detailed form
export interface FamilyMember {
    id: number;
    // Personal Info
    fullName: string;
    gender: 'Male' | 'Female' | '';
    dateOfBirth: string;
    // Learning Needs
    primaryGoals: string;
    quranicKnowledgeLevel: 'Beginner' | 'Intermediate' | 'Advanced' | '';
    virtualClassChallenges: string[];
    personalChallenges: string;
    supportExpectations: string;
    hoursPerWeek: string;
}