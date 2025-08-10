import React from 'react';

interface FormSelectProps {
  id: string;
  name: string; // FIX: Added the 'name' prop
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}

export const FormSelect: React.FC<FormSelectProps> = ({ id, name, label, value, onChange, options, required = true }) => {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-brand-dark/80 mb-1">{label}</label>
      <select id={id} name={name} value={value} onChange={onChange} required={required} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
        <option value="" disabled>Select an option</option>
        {options.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
      </select>
    </div>
  );
};