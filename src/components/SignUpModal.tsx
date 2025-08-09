'use client';

import React from 'react';
import { useSignUpModalStore } from '@/lib/store';
import { Modal } from './Modal';
import { SignUpForm } from './SignUpForm';

export const SignUpModal = () => {
  const { isOpen, closeModal } = useSignUpModalStore();

  return (
    <Modal isOpen={isOpen} onClose={closeModal}>
      <SignUpForm />
    </Modal>
  );
};