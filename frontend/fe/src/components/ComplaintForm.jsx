import React, { useEffect, useRef, useState } from "react";

const GOOGLE_MAPS_API_KEY = "YOUR_API_KEY"; // Replace with your actual key

function loadGoogleMapsScript(callback) {
  if (window.google && window.google.maps) {
    callback();
    return;
  }

  const existingScript = document.getElementById("googleMaps");
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.id = "googleMaps";
    script.async = true;
    script.defer = true;
    script.onload = callback;
    document.body.appendChild(script);
  } else {
    existingScript.onload = callback;
  }
}

const CameraIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block mr-2 mb-1"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    width="20"
    height="20"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8h4l3-3h4l3 3h4v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
    />
    <circle cx="12" cy="14" r="3" stroke="currentColor" strokeWidth={2} fill="none" />
  </svg>
);

const ComplaintForm = () => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Form state
  const [shopkeeperName, setShopkeeperName] = useState("");
  const [complaintDescription, setComplaintDescription] = useState("");
  const [dcEmail, setDcEmail] = useState("");
  const [shopImage, setShopImage] = useState(null);
  const [markerPosition, setMarkerPosition] = useState({ lat: 30.0452, lng: 72.3489 });

  // Initialize map
  useEffect(() => {
    loadGoogleMapsScript(() => {
      if (!mapRef.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center: markerPosition,
        zoom: 15,
      });

      const marker = new window.google.maps.Marker({
        position: markerPosition,
        map,
        draggable: true,
      });

      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        setMarkerPosition({ lat: pos.lat(), lng: pos.lng() });
      });

      markerRef.current = marker;
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    // For demo, log the values
    console.log({
      shopkeeperName,
      complaintDescription,
      dcEmail,
      shopLocation: `${markerPosition.lat}, ${markerPosition.lng}`,
      shopImage,
    });

    alert("Complaint submitted successfully!");

    // Reset form
    setShopkeeperName("");
    setComplaintDescription("");
    setDcEmail("");
    setShopImage(null);
  };

  return (
    <section id="complaint-section" className="max-w-3xl mx-auto p-6 bg-white rounded shadow-md mt-12">
      <h2 className="text-3xl font-bold mb-6 text-blue-900 text-center">Submit a Complaint</h2>

      <form onSubmit={handleSubmit} id="complaintForm" className="space-y-6">
        <div className="form-group flex flex-col">
          <label htmlFor="shopkeeperName" className="font-semibold mb-1">Shopkeeper's Name</label>
          <input
            type="text"
            id="shopkeeperName"
            placeholder="Enter shopkeeper's name"
            value={shopkeeperName}
            onChange={(e) => setShopkeeperName(e.target.value)}
            required
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="form-group flex flex-col">
          <label htmlFor="complaintDescription" className="font-semibold mb-1">Complaint Description</label>
          <textarea
            id="complaintDescription"
            rows="4"
            placeholder="Describe your complaint"
            value={complaintDescription}
            onChange={(e) => setComplaintDescription(e.target.value)}
            required
            className="border rounded px-3 py-2"
          ></textarea>
        </div>

        <div className="form-group flex flex-col">
          <label htmlFor="dcEmail" className="font-semibold mb-1">DC's Email</label>
          <input
            type="email"
            id="dcEmail"
            placeholder="Enter District Commissioner's email"
            value={dcEmail}
            onChange={(e) => setDcEmail(e.target.value)}
            required
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="form-group">
          <label className="font-semibold mb-2 block">Shop Location</label>
          <div id="map" ref={mapRef} style={{ width: "100%", height: "300px", borderRadius: "8px" }}></div>
          <p className="mt-2 text-sm text-gray-700">
            Marker Position: {markerPosition.lat.toFixed(5)}, {markerPosition.lng.toFixed(5)}
          </p>
        </div>

        <div className="form-group flex flex-col cursor-pointer">
          <label htmlFor="shopImage" className="font-semibold mb-1 flex items-center cursor-pointer">
            <CameraIcon />
            Upload Shop Image
          </label>
          <input
            type="file"
            id="shopImage"
            accept="image/*"
            capture="camera"
            onChange={(e) => setShopImage(e.target.files[0])}
            className="cursor-pointer"
          />
          {shopImage && <p className="mt-1 text-sm text-gray-700">Selected file: {shopImage.name}</p>}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-900 text-white font-bold py-3 rounded hover:bg-blue-800 transition"
        >
          Submit Complaint
        </button>
      </form>
    </section>
  );
};

export default ComplaintForm;
