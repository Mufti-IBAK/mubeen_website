import React from 'react';

interface FormCheckboxProps {
  id: string;
  name: string; // FIX: Added the 'name' prop
  label: React.ReactNode;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

export const FormCheckbox: React.FC<FormCheckboxProps> = ({ id, name, label, checked, onChange, required = true }) => {
  return (
    <div className="flex items-start mb-4">
      <input id={id} name={name} type="checkbox" checked={checked} onChange={onChange} required={required} className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary mt-1" />
      <div className="ml-3 text-sm"><label htmlFor={id} className="text-brand-dark/80">{label}</label></div>
    </div>
  );
};