import React, { useEffect, useState } from "react";

const ComplaintsForm = () => {
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [shopName, setShopName] = useState("");
  const [shopkeeperName, setShopkeeperName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const TOKEN = localStorage.getItem("token");

  useEffect(() => {
    fetch("http://localhost:8000/api/complaints/", {
      headers: {
        Authorization: `MyToken ${TOKEN}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch complaints");
        return res.json();
      })
      .then((data) => setComplaints(data))
      .catch((err) => {
        console.error(err);
        setComplaints([]);
      });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData();
    formData.append("shop_name", shopName);
    formData.append("shopkeeper_name", shopkeeperName);
    formData.append("location", location);
    formData.append("description", description);
    if (photo) formData.append("photo", photo);

    fetch("http://localhost:8000/api/complaints/", {
      method: "POST",
      headers: {
        Authorization: `MyToken ${TOKEN}`,
      },
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to submit complaint");
        return res.json();
      })
      .then((data) => {
        setComplaints((prev) => [...prev, data]);
        setShopName("");
        setShopkeeperName("");
        setLocation("");
        setDescription("");
        setPhoto(null);
        alert("Complaint submitted!");
      })
      .catch((err) => {
        console.error(err);
        alert("Error submitting complaint");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <section className="max-w-3xl mx-auto mt-16 p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-blue-900 mb-6 text-center">
        Complaint History
      </h2>

      {complaints.length === 0 ? (
        <p className="text-center text-gray-600">No complaints submitted yet.</p>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <div key={complaint.id}>
              <div
                className="flex justify-between items-center bg-blue-50 p-4 rounded shadow cursor-pointer hover:bg-blue-100"
                onClick={() =>
                  setSelectedComplaint(
                    selectedComplaint?.id === complaint.id ? null : complaint
                  )
                }
              >
                <span className="font-semibold text-blue-800">
                  {complaint.shop_name}
                </span>
                <span className="text-gray-700">{complaint.status}</span>
                <span className="text-gray-600">
                  {new Date(complaint.submitted_date).toLocaleDateString()}
                </span>
              </div>

              {selectedComplaint?.id === complaint.id && (
                <div className="mt-2 p-4 bg-blue-100 rounded shadow-inner">
                  <p>
                    <strong>Shopkeeper:</strong> {complaint.shopkeeper_name}
                  </p>
                  <p>
                    <strong>Location:</strong> {complaint.location}
                  </p>
                  <p className="mt-2">
                    <strong>Description:</strong> {complaint.description}
                  </p>
                  {complaint.photo && (
                    <img
                      src={`${complaint.photo}`}
                      alt="Complaint"
                      className="mt-2 max-w-full rounded border"
                    />
                  )}
                  <p className="mt-2 text-sm text-gray-600">
                    Submitted: {new Date(complaint.submitted_date).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <hr className="my-8" />

      <h3 className="text-2xl font-semibold text-blue-800 mb-4">
        Submit a New Complaint
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Shop Name"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Shopkeeper Name"
          value={shopkeeperName}
          onChange={(e) => setShopkeeperName(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="w-full p-2 border rounded"
          rows={4}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files[0])}
          className="w-full p-2"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-700 text-white py-2 px-4 rounded hover:bg-blue-800 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Complaint"}
        </button>
      </form>
    </section>
  );
};

export default ComplaintsForm;
