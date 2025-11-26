import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

const API_BASE_URL = "https://ratilalandsonscrm.onrender.com";

const AttendancePage = () => {
  // State
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [checkInLocation, setCheckInLocation] = useState(null);
  const [checkOutLocation, setCheckOutLocation] = useState(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [geoAddress, setGeoAddress] = useState("");
  const [geoTime, setGeoTime] = useState(null);
  const [geoError, setGeoError] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
          fetchAttendance(userData.id || userData._id || userData.user_id);
          detectLocation();
        } else {
          toast.error("Failed to load user data");
        }
      } catch {
        toast.error("Error loading user data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const fetchAttendance = async (userId) => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${API_BASE_URL}/api/hr/attendance?user_id=${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setAttendance(data.data);
          const todayRecord = data.data.find((rec) => rec.date === today);
          setTodayAttendance(todayRecord || null);
        } else {
          setAttendance([]);
          setTodayAttendance(null);
        }
      } else {
        setAttendance([]);
        setTodayAttendance(null);
      }
    } catch {
      toast.error("Error loading attendance records");
      setAttendance([]);
      setTodayAttendance(null);
    } finally {
      setIsLoading(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCheckInLocation({ latitude, longitude });
        setCheckOutLocation({ latitude, longitude });
        setGeoTime(new Date());
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { "Accept-Language": "en" } }
          );
          if (response.ok) {
            const data = await response.json();
            setGeoAddress(data.display_name || "Unknown location");
            setGeoError(null);
          } else {
            setGeoAddress(`Lat: ${latitude}, Long: ${longitude}`);
          }
        } catch {
          setGeoAddress(`Lat: ${latitude}, Long: ${longitude}`);
        }
      },
      () => setGeoError("Location permission denied or unavailable")
    );
  };

  const handleCheckIn = async () => {
    if (!checkInLocation) {
      toast.error("Location not detected");
      return;
    }
    setIsCheckingIn(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/api/hr/attendance/checkin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser?.id || currentUser?._id || currentUser?.user_id,
          date: today,
          checkin_time: new Date().toISOString(),
          geo_lat: checkInLocation.latitude,
          geo_long: checkInLocation.longitude,
          location: geoAddress,
          status: "present",
        }),
      });
      const resData = await response.json();
      if (response.ok) {
        toast.success("Checked in successfully");
        fetchAttendance(currentUser.id);
      } else {
        toast.error(resData.detail || "Check-in failed");
      }
    } catch {
      toast.error("Check-in failed");
    }
    setIsCheckingIn(false);
  };

  const handleCheckOut = async () => {
    if (!checkOutLocation) {
      toast.error("Location not detected");
      return;
    }
    setIsCheckingOut(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/api/hr/attendance/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance_id: todayAttendance?._id,
          user_id: currentUser?.id || currentUser?._id || currentUser?.user_id,
          checkout_time: new Date().toISOString(),
          checkout_geo_lat: checkOutLocation.latitude,
          checkout_geo_long: checkOutLocation.longitude,
          checkout_location: geoAddress,
        }),
      });
      const resData = await response.json();
      if (response.ok) {
        toast.success("Checked out successfully");
        fetchAttendance(currentUser.id);
      } else {
        toast.error(resData.detail || "Check-out failed");
      }
    } catch {
      toast.error("Check-out failed");
    }
    setIsCheckingOut(false);
  };

  // Utility for formatting time & date
  const formatTime = (date) =>
    new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  // Duration calculator
  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "N/A";
    const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-6 bg-gray-50 space-y-6 min-h-screen">
      <h1 className="text-3xl font-bold text-center text-indigo-700">My Attendance</h1>
      <p className="text-center text-gray-600 mb-6">Check in and check out for today</p>

      {currentUser && (
        <p className="text-center text-blue-600 mb-4">
          Welcome, <strong>{currentUser.full_name || currentUser.name || currentUser.username}</strong>!
        </p>
      )}

      {geoError ? (
        <div className="bg-red-100 p-4 rounded-lg text-red-700 text-center mb-6">{geoError}</div>
      ) : geoAddress ? (
        <div className="flex justify-between bg-green-100 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-2 text-green-700">
            <i className="fas fa-clock"></i>
            <span>Location Detected</span>
          </div>
          <button className="btn btn-primary" onClick={detectLocation}>Refresh Location</button>
        </div>
      ) : (
        <div className="text-center mb-6">Detecting location...</div>
      )}

      <motion.div
        className="bg-white rounded-lg shadow p-6 grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <i className="fas fa-check-circle text-green-600 text-3xl mb-2"></i>
          <div>Status</div>
          <div className="font-bold text-green-700">
            {todayAttendance ? (
              todayAttendance.status === "present" ? "Present" :
              todayAttendance.status === "absent" ? "Absent" :
              todayAttendance.status
            ) : "N/A"}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <i className="fas fa-clock text-blue-600 text-3xl mb-2"></i>
          <div>Check In</div>
          <div className="font-bold text-blue-700">
            {todayAttendance && (todayAttendance.checkin_time || todayAttendance.check_in)
              ? formatTime(todayAttendance.checkin_time || todayAttendance.check_in)
              : "-"}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <i className="fas fa-clock text-purple-600 text-3xl mb-2"></i>
          <div>Check Out</div>
          <div className="font-bold text-purple-700">
            {todayAttendance && (todayAttendance.checkout_time || todayAttendance.check_out)
              ? formatTime(todayAttendance.checkout_time || todayAttendance.check_out)
              : "-"}
          </div>
        </div>
      </motion.div>

      <motion.div className="flex justify-center items-center space-x-4 mt-4" initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
        {!todayAttendance || !todayAttendance.checkin_time && !todayAttendance.check_in ? (
          <button onClick={handleCheckIn}
            disabled={isCheckingIn}
            className={`px-6 py-3 rounded-md text-white font-semibold focus:outline-none focus:ring ${
              isCheckingIn ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}>
            {isCheckingIn ? "Checking in..." : "Check In"}
          </button>
        ) : (
          <button disabled className="px-6 py-3 rounded-md bg-gray-400 text-gray-700 cursor-not-allowed">Already Checked In</button>
        )}


        {!todayAttendance || !todayAttendance.checkout_time && !todayAttendance.check_out ? (
          <button onClick={handleCheckOut}
            disabled={isCheckingOut || !todayAttendance || !todayAttendance.checkin_time && !todayAttendance.check_in}
            className={`px-6 py-3 rounded-md text-white font-semibold focus:outline-none focus:ring ${
              isCheckingOut ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}>
            {isCheckingOut ? "Checking out..." : "Check Out"}
          </button>
        ) : (
          <button disabled className="px-6 py-3 rounded-md bg-gray-400 text-gray-700 cursor-not-allowed">Already Checked Out</button>
        )}
      </motion.div>

      <motion.div className="mt-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Attendance History</h2>
        <div className="overflow-x-auto">
          {attendance.length ? (
            <table className="w-full table-auto border-collapse border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border border-gray-300 text-left text-gray-600">Date</th>
                  <th className="p-2 border border-gray-300 text-left text-gray-600">Check In</th>
                  <th className="p-2 border border-gray-300 text-left text-gray-600">Location</th>
                  <th className="p-2 border border-gray-300 text-left text-gray-600">Check Out</th>
                  <th className="p-2 border border-gray-300 text-left text-gray-600">Location</th>
                  <th className="p-2 border border-gray-300 text-left text-gray-600">Duration</th>
                  <th className="p-2 border border-gray-300 text-left text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record, idx) => (
                  <tr key={record._id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-2 border border-gray-300">{formatDate(record.date)}</td>
                    <td className="p-2 border border-gray-300">{record.checkin_time ? formatTime(record.checkin_time) : record.check_in || "N/A"}</td>
                    <td className="p-2 border border-gray-300 text-sm text-gray-600">
                      {record.location || (record.geo_location?.address) || (record.geo_lat && record.geo_long && `${record.geo_lat.toFixed(6)}, ${record.geo_long.toFixed(6)}`) || "N/A"}
                    </td>
                    <td className="p-2 border border-gray-300">{record.checkout_time ? formatTime(record.checkout_time) : record.check_out || "N/A"}</td>
                    <td className="p-2 border border-gray-300 text-sm text-gray-600">
                      {record.checkout_location || (record.checkout_geo_location?.address) || (record.checkout_geo_lat && record.checkout_geo_long && `${record.checkout_geo_lat.toFixed(6)}, ${record.checkout_geo_long.toFixed(6)}`) || "N/A"}
                    </td>
                    <td className="p-2 border border-gray-300">
                      {record.working_hours ? `${record.working_hours} hrs` : (record.checkin_time && record.checkout_time) ? calculateDuration(record.checkin_time, record.checkout_time) : "N/A"}
                    </td>
                    <td className="p-2 border border-gray-300">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === "present" ? "bg-green-100 text-green-800" :
                        record.status === "absent" ? "bg-red-100 text-red-800" :
                        record.status === "half_day" ? "bg-yellow-100 text-yellow-800" :
                        record.status === "leave" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {record.status === "present" ? "Present" :
                         record.status === "absent" ? "Absent" :
                         record.status === "half_day" ? "Half Day" :
                         record.status === "leave" ? "On Leave" : record.status || "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-4 text-gray-500">No attendance records found</div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AttendancePage;
