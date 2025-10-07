'use client';

export default function InstructorSelect({ instructors, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
    >
      <option value="">No instructor assigned</option>
      {instructors.map((instructor) => (
        <option key={instructor.id} value={instructor.id}>
          {instructor.full_name || instructor.username} ({instructor.username})
        </option>
      ))}
    </select>
  );
}