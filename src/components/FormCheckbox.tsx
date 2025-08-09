import React from 'react';

interface FormCheckboxProps {
  id: string;
  label: React.ReactNode; // Label can contain links or other elements
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

export const FormCheckbox: React.FC<FormCheckboxProps> = ({ id, label, checked, onChange, required = true }) => {
  return (
    <div className="flex items-start mb-4">
      <input id={id} name={id} type="checkbox" checked={checked} onChange={onChange} required={required} className="w-4 h-4 mt-1 border-gray-300 rounded text-brand-primary focus:ring-brand-primary" />
      <div className="ml-3 text-sm">
        <label htmlFor={id} className="text-brand-dark/80">{label}</label>
      </div>
    </div>
  );
};