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

// Admin/User domain types
export type Role = 'student' | 'admin' | 'teacher';

  id: string; // uuid
  role: Role;
  months_remaining: number;
  created_at: string;
  whatsapp_number?: string;
  email?: string;
  full_name?: string;
  phone?: string;
}

export interface Course {
  id: number;
  title: string;
  slug: string;
  description?: string;
  image_url?: string;
  price_per_month?: number;
  price_per_semester?: number;
  is_flagship: boolean;
  created_at: string;
}

export type FormType = 'individual' | 'family_head' | 'family_member';
export interface CourseForm {
  id: number;
  course_id: number;
  form_type: FormType;
  schema: unknown;
  created_by?: string;
  created_at: string;
}

export interface Enrollment {
  id: number;
  user_id: string;
  course_id: number;
  is_family: boolean;
  family_group_id?: number | null;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  payment_status: 'unpaid' | 'paid' | 'failed';
  created_at: string;
}

export interface CourseProgress {
  id: number;
  user_id: string;
  course_id: number;
  progress_percent: number;
  months_remaining: number;
  updated_at: string;
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

// FIX: This is the complete, comprehensive structure for EACH family member.
export interface FamilyMember {
    id: number;
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
    // Section 3: Learning Expectations
    primaryGoals: string;
    quranicKnowledgeLevel: 'Beginner' | 'Intermediate' | 'Advanced' | '';
    attendedVirtualClasses: 'Yes' | 'No' | '';
    personalChallenges: string;
    supportExpectations: string;
    hoursPerWeek: string;
}

export interface RegistrationFormData {
  enrollmentType: 'individual' | 'family' | '';
  familySize: string;
  // Section 1: Personal Information (for Individual)
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
  // Section 3: Learning Expectations (for Individual)
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
  familyMembers: Partial<FamilyMember>[];
}