import { useCallback, useEffect, useRef, useState } from 'react';
import { FaBell } from 'react-icons/fa';
import { api } from '../api';
import { useToast } from '../context/useToast';

const REFRESH_MS = 60_000;

const NotificationDropdown = () => {
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState('unread');
  const containerRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setNotifications(await api.get('/notifications/'));
    } catch (err) {
      console.error('Failed to fetch notifications', err); // background refresh: stay quiet
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!showDropdown) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !containerRef.current?.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [showDropdown]);

  const markAsRead = async (notif) => {
    if (notif.is_read) return;
    try {
      await api.patch(`/notifications/${notif.id}/`, { is_read: true });
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filtered = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => {
          if (!showDropdown) fetchNotifications();
          setShowDropdown(!showDropdown);
        }}
        className="relative text-white hover:text-yellow-300"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={showDropdown}
      >
        <FaBell className="text-xl" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-xs text-white rounded-full px-1.5">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white text-black rounded shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center px-4 py-2 border-b">
            <strong>Notifications</strong>
            <div>
              <button
                onClick={() => setFilter('unread')}
                className={`text-sm px-2 ${filter === 'unread' ? 'text-blue-700 font-bold' : 'text-gray-600'}`}
              >
                Unread
              </button>
              |
              <button
                onClick={() => setFilter('all')}
                className={`text-sm px-2 ${filter === 'all' ? 'text-blue-700 font-bold' : 'text-gray-600'}`}
              >
                All
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-4 text-gray-500">No notifications.</div>
          ) : (
            filtered.map((notif) => (
              <button
                type="button"
                key={notif.id}
                className={`block w-full text-left px-4 py-2 border-b hover:bg-blue-50 ${
                  notif.is_read ? 'text-gray-600' : 'text-black font-semibold'
                }`}
                onClick={() => markAsRead(notif)}
              >
                <p>{notif.message}</p>
                <p className="text-xs text-gray-500">{new Date(notif.timestamp).toLocaleString()}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
