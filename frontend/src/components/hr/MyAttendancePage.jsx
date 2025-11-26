import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, UserCheck } from "lucide-react";

const API_BASE_URL = "https://ratilalandsons.onrender.com";

const UserAttendanceView = () => {
  const [activeTab, setActiveTab] = useState("manual");
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [checkInLocation, setCheckInLocation] = useState(null);
  const [checkOutLocation, setCheckOutLocation] = useState(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [geoAddress, setGeoAddress] = useState("");
  const [geoTime, setGeoTime] = useState(null);
  const [geoError, setGeoError] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  // Helper to get token and validate basic format
  const getToken = () => {
    const token = localStorage.getItem("access_token");
    if (!token || token.split(".").length !== 3) {
      console.error("Invalid or missing JWT token");
      return null;
    }
    return token;
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = getToken();
        if (!token) {
          setCurrentUser(null);
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
          if (activeTab === "manual") detectLocation();
        } else {
          toast.error("Failed to load user data");
          console.error("User fetch error:", response.status, await response.text());
        }
      } catch (err) {
        toast.error("Error loading user data");
        console.error("User fetch exception:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCurrentUser();
    // eslint-disable-next-line
  }, [activeTab]);

  const fetchAttendance = async (userId) => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setTodayAttendance(null);
        setIsLoading(false);
        return;
      }
      const response = await fetch(
        `${API_BASE_URL}/api/hr/attendance?user_id=${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const todayRecord = data.data.find((rec) => rec.date === today);
          setTodayAttendance(todayRecord || null);
        } else {
          setTodayAttendance(null);
        }
      } else {
        setTodayAttendance(null);
        console.error("Attendance fetch error:", response.status, await response.text());
      }
    } catch (err) {
      toast.error("Error loading attendance records");
      setTodayAttendance(null);
      console.error("Attendance fetch exception:", err);
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
      const token = getToken();
      if (!token) {
        toast.error("No valid access token found, please login again");
        return;
      }
      setIsCheckingIn(true);
      try {
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
        if (response.ok) {
          toast.success("Checked in successfully");
          fetchAttendance(currentUser.id || currentUser._id || currentUser.user_id);
        } else {
          const resData = await response.json();
          toast.error(resData.detail || "Check-in failed");
          console.error("Check-in failed", await response.text());
        }
      } catch (err) {
        toast.error("Check-in failed");
        console.error("Check-in exception:", err);
      }
      setIsCheckingIn(false);
    };

  const handleCheckOut = async () => {
    if (!checkOutLocation) {
      toast.error("Location not detected");
      return;
    }
    const token = getToken();
    if (!token) {
      toast.error("No valid access token found, please login again");
      return;
    }
    setIsCheckingOut(true);
    try {
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
      if (response.ok) {
        toast.success("Checked out successfully");
        fetchAttendance(currentUser.id || currentUser._id || currentUser.user_id);
      } else {
        const resData = await response.json();
        toast.error(resData.detail || "Check-out failed");
        console.error("Check-out failed", await response.text());
      }
    } catch (err) {
      toast.error("Check-out failed");
      console.error("Check-out exception:", err);
    }
    setIsCheckingOut(false);
  };

  const alreadyCheckedIn =
    todayAttendance && (todayAttendance.checkin_time || todayAttendance.check_in);
  const alreadyCheckedOut =
    todayAttendance && (todayAttendance.checkout_time || todayAttendance.check_out);

  return (
    <div className="max-w-8xl mx-auto px-2 py-8">
      {/* Header */}
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Attendance</h1>
        <p className="text-gray-600">Check in and check out for today</p>
        {currentUser && (
          <p className="text-lg font-medium text-blue-600 mt-2">
            Welcome, {currentUser.full_name || currentUser.name || currentUser.username}!
          </p>
        )}
      </div>

      {/* Dashboard-style Tabs */}
      <div className="border-b mb-8 flex items-center space-x-1 bg-white">
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex items-center px-5 py-2 text-md font-medium focus:outline-none border-b-2 transition
            ${activeTab === "manual"
              ? "text-indigo-700 border-indigo-700"
              : "text-gray-500 border-transparent hover:text-indigo-600"
            }`}
        >
          <UserCheck className="w-5 h-5 mr-2" />
          Manual
        </button>
        <button
          onClick={() => setActiveTab("auto")}
          className={`flex items-center px-5 py-2 text-md font-medium focus:outline-none border-b-2 transition
            ${activeTab === "auto"
              ? "text-indigo-700 border-indigo-700"
              : "text-gray-500 border-transparent hover:text-indigo-600"
            }`}
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Auto Mark
        </button>
      </div>

      {/* Manual Tab */}
      {activeTab === "manual" && (
        <>
          {/* Location Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${checkInLocation?.latitude ? "bg-green-100" : "bg-yellow-100"}`}>
                  <Clock className={`w-6 h-6 ${checkInLocation?.latitude ? "text-green-600" : "text-yellow-600"}`} />
                </div>
                <div className="ml-4">
                  <p className="text-lg font-semibold text-gray-900">{checkInLocation?.latitude ? "Location Detected" : "Location Required"}</p>
                  <p className="text-sm text-gray-600">
                    {geoError
                      ? geoError
                      : checkInLocation?.latitude
                      ? geoAddress || `${checkInLocation.latitude.toFixed(6)}, ${checkInLocation.longitude.toFixed(6)}`
                      : "Please enable location services"}
                  </p>
                </div>
              </div>
              <button
                onClick={detectLocation}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Refresh Location
              </button>
            </div>
          </div>

          {/* Today's Attendance Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading your attendance...</p>
              </div>
            ) : todayAttendance ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Status */}
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-600">Status</p>
                  <p className="text-lg font-bold text-green-800 capitalize">{todayAttendance.status || "Present"}</p>
                </div>
                {/* Check In */}
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-blue-600">Check In</p>
                  <p className="text-lg font-bold text-blue-800">
                    {todayAttendance.checkin_time
                      ? new Date(todayAttendance.checkin_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : todayAttendance.check_in
                      ? new Date(todayAttendance.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "-"}
                  </p>
                </div>
                {/* Check Out */}
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-purple-600">Check Out</p>
                  <p className="text-lg font-bold text-purple-800">
                    {todayAttendance.checkout_time
                      ? new Date(todayAttendance.checkout_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : todayAttendance.check_out
                      ? new Date(todayAttendance.check_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Not yet"}
                  </p>
                </div>
                {/* Working Hour */}
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-yellow-600">Working Hour</p>
                  <p className="text-lg font-bold text-yellow-800">
                    {todayAttendance.checkout_time
                      ? new Date(todayAttendance.checkout_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : todayAttendance.check_out
                      ? new Date(todayAttendance.check_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Not yet"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No attendance record for today</p>
              </div>
            )}
          </div>

          {/* Check-in/Check-out Buttons */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CHECK IN BUTTON */}
              <button
                onClick={handleCheckIn}
                disabled={
                  !checkInLocation ||
                  alreadyCheckedIn
                }
                className={`w-full py-4 px-6 rounded-lg font-semibold text-lg flex items-center justify-center ${
                  !checkInLocation || alreadyCheckedIn
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                <CheckCircle className="w-6 h-6 mr-2" />
                {alreadyCheckedIn
                  ? "Already Checked In"
                  : "Check In"}
              </button>

              {/* CHECK OUT BUTTON */}
              <button
                onClick={handleCheckOut}
                disabled={
                  !checkOutLocation ||
                  !alreadyCheckedIn ||
                  alreadyCheckedOut
                }
                className={`w-full py-4 px-6 rounded-lg font-semibold text-lg flex items-center justify-center ${
                  !checkOutLocation || !alreadyCheckedIn || alreadyCheckedOut
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                <XCircle className="w-6 h-6 mr-2" />
                {!alreadyCheckedIn
                  ? "Check In First"
                  : alreadyCheckedOut
                  ? "Already Checked Out"
                  : "Check Out"}
              </button>
            </div>

            {/* LOCATION WARNING BOX */}
            {!checkOutLocation && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-800">
                    Location access is required for attendance. Please click "Refresh Location" and allow location access.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Auto Mark Tab */}
      {activeTab === "auto" && (
        <motion.div
          className="bg-white shadow rounded-xl p-12 flex flex-col items-center justify-center min-h-[300px] mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <RefreshCw className="w-8 h-8 text-indigo-600 mb-4" />
          <h2 className="text-2xl font-bold text-indigo-600 mb-2">Auto Mark Attendance</h2>
          <p className="mb-4 text-gray-500 text-center">
            This is a placeholder for the Auto Mark tab. Add your automatic attendance logic or instructions here to match the rest of the UI.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default UserAttendanceView;
