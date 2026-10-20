export default function AlertBadge({ type, children }) {
  let color = "bg-gray-300 text-gray-800";
  if (type === "danger") color = "bg-red-100 text-red-700";
  if (type === "warning") color = "bg-yellow-100 text-yellow-800";
  if (type === "success") color = "bg-green-100 text-green-700";

  return (
    <span className={`px-2 py-1 rounded-full text-sm font-medium ${color}`}>{children}</span>
  );
}
