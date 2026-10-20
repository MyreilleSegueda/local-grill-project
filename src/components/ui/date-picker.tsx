import React from "react";

export interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ label, ...props }) => (
  <label className="flex flex-col gap-1">
    {label && <span className="text-sm font-medium">{label}</span>}
    <input type="date" className="form-input rounded border-gray-300 focus:ring-blue-500" {...props} />
  </label>
);

export default DatePicker;
