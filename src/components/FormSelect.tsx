import React from 'react';

interface FormSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}

export const FormSelect: React.FC<FormSelectProps> = ({ id, label, value, onChange, options, required = true }) => {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block mb-1 text-sm font-medium text-brand-dark/80">{label}</label>
      <select id={id} name={id} value={value} onChange={onChange} required={required} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
        <option value="" disabled>Select an option</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
};