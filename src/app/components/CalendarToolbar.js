export default function CalendarToolbar  ({ label, onNavigate, onView, view }) {
    return (
      <div className="flex justify-between items-center mb-4 p-2 z-50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('PREV')}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ←
          </button>
          <button
            onClick={() => onNavigate('TODAY')}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Today
          </button>
          <button
            onClick={() => onNavigate('NEXT')}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            →
          </button>
        </div>
        
        <h3 className="text-lg font-semibold">{label}</h3>
        
        <div className="flex gap-1">
          <button
            onClick={() => onView('month')}
            className={`px-3 py-1 rounded ${view === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Month
          </button>
          <button
            onClick={() => onView('week')}
            className={`px-3 py-1 rounded ${view === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Week
          </button>
        </div>
      </div>
    );
  };