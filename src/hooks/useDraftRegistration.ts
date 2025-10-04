import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface DraftData {
  id: string;
  program_id: string;
  program_title: string;
  program_image: string;
  registration_type: 'individual' | 'family_head' | 'family_member';
  draft_data: Record<string, any>;
  family_size?: number;
  last_edited_at: string;
  user_name: string;
  user_email: string;
}

export interface UseDraftRegistrationOptions {
  programId: string;
  registrationType: 'individual' | 'family_head' | 'family_member';
  autoSaveDelay?: number; // milliseconds
  onSaveSuccess?: () => void;
  onSaveError?: (error: string) => void;
}

export function useDraftRegistration({
  programId,
  registrationType,
  autoSaveDelay = 3000, // 3 seconds
  onSaveSuccess,
  onSaveError,
}: UseDraftRegistrationOptions) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = useRef(false);

  // Load existing draft on mount
  useEffect(() => {
    loadExistingDraft();
  }, [programId, registrationType]);

  // Auto-save when form data changes
  useEffect(() => {
    if (hasChangesRef.current) {
      scheduleAutoSave();
    }
  }, [formData]);

  const loadExistingDraft = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/drafts', { credentials: 'same-origin' });
      if (!response.ok) {
        if (response.status === 401) return; // treat as no drafts
        throw new Error('Failed to load drafts');
      }
      
      const { drafts } = await response.json();
      const existingDraft = drafts.find((draft: DraftData) => 
        draft.program_id === programId && 
        draft.registration_type === registrationType
      );
      
      if (existingDraft) {
        setFormData(existingDraft.draft_data || {});
        setDraftId(existingDraft.id);
        setLastSaved(new Date(existingDraft.last_edited_at));
        hasChangesRef.current = false;
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to load saved progress',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleAutoSave = () => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Schedule new auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, autoSaveDelay);
  };

  const saveDraft = async (showToast = false) => {
    if (isSaving || Object.keys(formData).length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: programId,
          registration_type: registrationType,
          form_data: formData,
        }),
      });

      if (!response.ok) throw new Error('Failed to save draft');

      const { draft } = await response.json();
      setDraftId(draft.id);
      setLastSaved(new Date());
      hasChangesRef.current = false;

      if (showToast) {
        toast({
          title: 'Draft Saved',
          description: 'Your progress has been saved successfully',
        });
      }

      onSaveSuccess?.();
    } catch (error) {
      console.error('Error saving draft:', error);
      const errorMessage = 'Failed to save progress';
      
      if (showToast) {
        toast({
          title: 'Save Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      
      onSaveError?.(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    hasChangesRef.current = true;
  }, []);

  const updateMultipleFields = useCallback((updates: Record<string, any>) => {
    setFormData(prev => ({
      ...prev,
      ...updates,
    }));
    hasChangesRef.current = true;
  }, []);

  const resetForm = useCallback(() => {
    setFormData({});
    hasChangesRef.current = false;
    setLastSaved(null);
  }, []);

  const finalizeDraft = async () => {
    if (!draftId) {
      throw new Error('No draft to finalize');
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId }),
      });

      if (!response.ok) throw new Error('Failed to finalize registration');

      const { registration_id } = await response.json();
      
      // Clear draft state
      setDraftId(null);
      setFormData({});
      setLastSaved(null);
      hasChangesRef.current = false;

      toast({
        title: 'Registration Submitted',
        description: 'Your registration has been submitted successfully!',
      });

      return registration_id;
    } catch (error) {
      console.error('Error finalizing draft:', error);
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit registration. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDraft = async () => {
    if (!draftId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/drafts?id=${draftId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete draft');

      // Clear draft state
      setDraftId(null);
      setFormData({});
      setLastSaved(null);
      hasChangesRef.current = false;

      toast({
        title: 'Draft Deleted',
        description: 'Your draft has been deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete draft. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const manualSave = () => saveDraft(true);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Save before page unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasChangesRef.current && !isSaving) {
        // Fire and forget - browser will handle this
        saveDraft();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    // State
    formData,
    isLoading,
    isSaving,
    lastSaved,
    draftId,
    hasDraft: !!draftId,
    hasUnsavedChanges: hasChangesRef.current,

    // Actions
    updateFormData,
    updateMultipleFields,
    resetForm,
    saveDraft: manualSave,
    finalizeDraft,
    deleteDraft,
    
    // Utilities
    getSavedValue: (field: string) => formData[field],
    isFieldSaved: (field: string) => field in formData,
  };
}

// Helper hook for loading all user drafts
export function useUserDrafts() {
  const [drafts, setDrafts] = useState<DraftData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadDrafts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/drafts', { credentials: 'same-origin' });
      if (!response.ok) {
        if (response.status === 401) { setDrafts([]); return; }
        throw new Error('Failed to load drafts');
      }
      
      const { drafts: userDrafts } = await response.json();
      setDrafts(userDrafts);
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  return {
    drafts,
    isLoading,
    refreshDrafts: loadDrafts,
  };
}
