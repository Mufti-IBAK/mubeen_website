import React from 'react';

interface FormInputProps {
  id: string;
  name: string; // FIX: Added the 'name' prop
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({ id, name, label, type = 'text', value, onChange, required = true }) => {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-brand-dark/80 mb-1">{label}</label>
      <input type={type} id={id} name={name} value={value} onChange={onChange} required={required} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
    </div>
  );
};