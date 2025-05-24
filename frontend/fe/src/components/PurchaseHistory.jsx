import React, { useEffect, useState } from 'react';

const PurchaseHistory = () => {
  const [history, setHistory] = useState([]);
  const [selectedDetails, setSelectedDetails] = useState(null);

  useEffect(() => {
    // Simulate fetching history data (replace with real API call)
    const fetchHistory = () => {
      // Example static data; replace with real data fetching
      const data = [
        { id: 1, item: "Wheat", quantity: 10, date: "2025-05-20" },
        { id: 2, item: "Rice", quantity: 5, date: "2025-05-18" },
      ];
      setHistory(data);
    };

    fetchHistory();
  }, []);

  return (
    <section
      id="history-section"
      className="max-w-3xl mx-auto mt-16 p-8 bg-white rounded-lg shadow-lg"
    >
      <h2 className="text-3xl font-bold text-blue-900 mb-6 text-center">
        Purchase History
      </h2>

      {history.length === 0 ? (
        <p className="text-center text-gray-600">No history available yet.</p>
      ) : (
        <div id="history-list" className="space-y-4">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex justify-between items-center bg-blue-50 p-4 rounded shadow cursor-pointer hover:bg-blue-100"
              onClick={() => setSelectedDetails(entry)}
            >
              <span className="font-semibold text-blue-800">{entry.item}</span>
              <span className="text-gray-700">Qty: {entry.quantity}</span>
              <span className="text-gray-600">{entry.date}</span>
            </div>
          ))}
        </div>
      )}

      {selectedDetails && (
        <div
          id="history-details"
          className="mt-8 p-6 bg-blue-100 rounded-lg shadow-md"
        >
          <h3 className="text-xl font-semibold text-blue-900 mb-2">
            Details for {selectedDetails.item}
          </h3>
          <p>
            Quantity: <strong>{selectedDetails.quantity}</strong>
          </p>
          <p>
            Purchase Date: <strong>{selectedDetails.date}</strong>
          </p>
          {/* Add more details as needed */}
          <button
            onClick={() => setSelectedDetails(null)}
            className="mt-4 px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
          >
            Close Details
          </button>
        </div>
      )}
    </section>
  );
};

export default PurchaseHistory;
