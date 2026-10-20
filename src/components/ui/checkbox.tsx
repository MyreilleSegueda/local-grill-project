import React from "react";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, ...props }) => (
  <label className="inline-flex items-center gap-2 cursor-pointer">
    <input type="checkbox" className="form-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500" {...props} />
    {label && <span className="text-sm">{label}</span>}
  </label>
);

export default Checkbox;
