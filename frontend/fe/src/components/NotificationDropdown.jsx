// components/NotificationDropdown.jsx
import React, { useEffect, useState } from "react";
import { FaBell } from "react-icons/fa";

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState("unread");
  const TOKEN = localStorage.getItem("token");

  const fetchNotifications = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/notifications/", {
        headers: {
          Authorization: `MyToken ${TOKEN}`,
        },
      });

      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await fetch(`http://localhost:8000/api/notifications/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `MyToken ${TOKEN}`,
        },
        body: JSON.stringify({ is_read: true }),
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const filtered = filter === "unread"
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative text-white hover:text-yellow-300"
      >
        <FaBell className="text-xl" />
        {notifications.some((n) => !n.is_read) && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-xs text-white rounded-full px-1">
            {notifications.filter((n) => !n.is_read).length}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center px-4 py-2 border-b">
            <strong>Notifications</strong>
            <div>
              <button
                onClick={() => setFilter("unread")}
                className={`text-sm px-2 ${filter === "unread" ? "text-blue-600 font-bold" : "text-gray-600"}`}
              >
                Unread
              </button>
              |
              <button
                onClick={() => setFilter("all")}
                className={`text-sm px-2 ${filter === "all" ? "text-blue-600 font-bold" : "text-gray-600"}`}
              >
                All
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-4 text-gray-500">No notifications.</div>
          ) : (
            filtered.map((notif) => (
              <div
                key={notif.id}
                className={`px-4 py-2 border-b cursor-pointer hover:bg-blue-50 ${
                  notif.is_read ? "text-gray-600" : "text-black font-semibold"
                }`}
                onClick={() => markAsRead(notif.id)}
              >
                <p>{notif.message}</p>
                <p className="text-xs text-gray-400">
                  {new Date(notif.timestamp).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
