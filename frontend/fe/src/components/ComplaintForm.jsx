import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { FaUpload } from 'react-icons/fa';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { api } from '../api';
import { useToast } from '../context/useToast';
import Loading from './Loading';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Sheikhupura, Punjab
const MAP_CENTER = [31.7131, 73.9783];
const INPUT = 'w-full p-2 border rounded';
const EMPTY_FORM = { shopName: '', shopkeeperName: '', dcEmail: '', location: '', description: '' };

// The server emails the DC in the background, so check again shortly after submitting.
const RECHECK_DELIVERY_MS = 5000;

const STATUS_STYLE = {
  Pending: 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  Resolved: 'bg-green-100 text-green-800',
};

const LocationMarker = ({ coordinates, setCoordinates }) => {
  useMapEvents({
    click(e) {
      setCoordinates(e.latlng);
    },
  });
  return coordinates ? <Marker position={coordinates} /> : null;
};

const ComplaintsForm = () => {
  const toast = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/complaints/')
      .then((data) => {
        if (!cancelled) setComplaints(data);
      })
      .catch((err) => !cancelled && toast.error(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const setField = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData();
    formData.append('shop_name', form.shopName.trim());
    formData.append('shopkeeper_name', form.shopkeeperName.trim());
    formData.append('dc_email', form.dcEmail.trim());
    formData.append('location', form.location.trim());
    formData.append('description', form.description.trim());
    if (photo) formData.append('photo', photo);
    if (coordinates) {
      formData.append('latitude', coordinates.lat);
      formData.append('longitude', coordinates.lng);
    }

    try {
      const created = await api.post('/complaints/', formData);
      setComplaints((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
      setPhoto(null);
      setCoordinates(null);
      toast.success('Complaint submitted. It is being emailed to the DC.');
      setTimeout(async () => {
        try {
          const fresh = await api.get('/complaints/');
          if (mounted.current) setComplaints(fresh);
        } catch {
          /* the list refreshes on the next visit anyway */
        }
      }, RECHECK_DELIVERY_MS);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const ordered = [...complaints].sort((a, b) => new Date(b.submitted_date) - new Date(a.submitted_date));

  return (
    <section className="max-w-3xl mx-auto mt-16 p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-blue-900 mb-6 text-center">Complaint History</h2>

      {loading ? (
        <Loading />
      ) : ordered.length === 0 ? (
        <p className="text-center text-gray-600">No complaints submitted yet.</p>
      ) : (
        <div className="space-y-4">
          {ordered.map((complaint) => (
            <div key={complaint.id}>
              <button
                type="button"
                aria-expanded={selectedComplaint?.id === complaint.id}
                className="w-full flex justify-between items-center gap-2 flex-wrap text-left bg-blue-50 p-4 rounded shadow hover:bg-blue-100"
                onClick={() => setSelectedComplaint(selectedComplaint?.id === complaint.id ? null : complaint)}
              >
                <span className="font-semibold text-blue-800">{complaint.shop_name}</span>
                <span className={`px-2 py-0.5 rounded text-sm ${STATUS_STYLE[complaint.status] || ''}`}>
                  {complaint.status}
                </span>
                <span className="text-gray-600">{new Date(complaint.submitted_date).toLocaleDateString()}</span>
              </button>

              {selectedComplaint?.id === complaint.id && (
                <div className="mt-2 p-4 bg-blue-100 rounded shadow-inner">
                  <p><strong>Shopkeeper:</strong> {complaint.shopkeeper_name}</p>
                  <p><strong>DC Email:</strong> {complaint.dc_email}</p>
                  <p><strong>Location:</strong> {complaint.location}</p>
                  <p>
                    <strong>Emailed to DC:</strong>{' '}
                    {complaint.dc_notified_at
                      ? `Yes, on ${new Date(complaint.dc_notified_at).toLocaleString()}`
                      : 'Not yet (it is being sent, or the email could not be delivered)'}
                  </p>
                  <p className="mt-2"><strong>Description:</strong> {complaint.description}</p>
                  {complaint.photo && (
                    <img src={complaint.photo} alt="Complaint evidence" className="mt-2 max-w-full rounded border" />
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

      <h3 className="text-2xl font-semibold text-blue-800 mb-4">Submit a New Complaint</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Shop Name"
          aria-label="Shop name"
          value={form.shopName}
          onChange={setField('shopName')}
          required
          className={INPUT}
        />
        <input
          type="text"
          placeholder="Shopkeeper Name"
          aria-label="Shopkeeper name"
          value={form.shopkeeperName}
          onChange={setField('shopkeeperName')}
          required
          className={INPUT}
        />
        <input
          type="email"
          placeholder="DC Email"
          aria-label="DC email"
          value={form.dcEmail}
          onChange={setField('dcEmail')}
          required
          className={INPUT}
        />
        <input
          type="text"
          placeholder="Location (area, city)"
          aria-label="Location"
          value={form.location}
          onChange={setField('location')}
          required
          className={INPUT}
        />
        <textarea
          placeholder="Describe what happened"
          aria-label="Description"
          value={form.description}
          onChange={setField('description')}
          required
          className={INPUT}
          rows={4}
        />

        <div className="flex items-center gap-3 flex-wrap">
          <label
            htmlFor="file-upload"
            className="flex items-center px-4 py-2 bg-blue-700 text-white rounded cursor-pointer hover:bg-blue-800"
          >
            <FaUpload className="mr-2" aria-hidden="true" />
            Upload Photo
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0] || null)}
            className="sr-only"
          />
          <span className="text-sm text-gray-600">{photo ? photo.name : 'No photo selected'}</span>
        </div>

        <div>
          <p className="block text-gray-700 mb-1">
            Click the map to mark the shop's location{' '}
            <span className="text-sm text-gray-500">
              {coordinates
                ? `(selected: ${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)})`
                : '(optional)'}
            </span>
          </p>
          <MapContainer center={MAP_CENTER} zoom={13} style={{ height: '300px', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker coordinates={coordinates} setCoordinates={setCoordinates} />
          </MapContainer>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-700 text-white py-2 px-4 rounded hover:bg-blue-800 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Complaint'}
        </button>
      </form>
    </section>
  );
};

export default ComplaintsForm;
