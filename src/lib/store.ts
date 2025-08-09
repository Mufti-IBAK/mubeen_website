import { create } from 'zustand';

// Define the shape of our store's state and actions
interface SignUpModalState {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

// Create the store
export const useSignUpModalStore = create<SignUpModalState>((set) => ({
  isOpen: false, // Initially, the modal is closed
  openModal: () => set({ isOpen: true }), // An action to set 'isOpen' to true
  closeModal: () => set({ isOpen: false }), // An action to set 'isOpen' to false
}));