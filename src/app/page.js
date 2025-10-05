

export default function Home() {
  return (
    
    <div className="text-center mt-20">
      <h1 className="text-4xl font-bold text-blue-600">Üdvözöljük a Mozgás Központban</h1>
      <p className="mt-4 text-gray-700">Mozgás Központ, központban a mozgás!</p>
      <a
        href="/calendar"
        className="inline-block mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700"
      >
        Go to Calendar
      </a>
    </div>
  );
}
