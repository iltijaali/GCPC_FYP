import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { FaUpload } from "react-icons/fa";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const LocationMarker = ({ setCoordinates }) => {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      setCoordinates(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const ComplaintsForm = () => {
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [dcEmail, setDcEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopkeeperName, setShopkeeperName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
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
    formData.append("dc_email", dcEmail);
    formData.append("location", location);
    formData.append("description", description);
    if (photo) formData.append("photo", photo);
    if (coordinates) {
      formData.append("latitude", coordinates.lat);
      formData.append("longitude", coordinates.lng);
    }

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
        setDcEmail("");
        setLocation("");
        setDescription("");
        setPhoto(null);
        setCoordinates(null);
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
                    <strong>DC Email:</strong> {complaint.dc_email}
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
          type="email"
          placeholder="DC Email"
          value={dcEmail}
          onChange={(e) => setDcEmail(e.target.value)}
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

        <div className="flex items-center space-x-2">
          <label
            htmlFor="file-upload"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700"
          >
            <FaUpload className="mr-2" />
            Upload Photo
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])}
            className="hidden"
          />
        </div>

        {/* Map for selecting location */}
        <div>
          <label className="block text-gray-700">Select Location on Map:</label>
          <MapContainer
            center={[31.7131, 73.9783]} // Centered at Sheikhupura
            zoom={13}
            style={{ height: "300px", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker setCoordinates={setCoordinates} />
          </MapContainer>
        </div>

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
