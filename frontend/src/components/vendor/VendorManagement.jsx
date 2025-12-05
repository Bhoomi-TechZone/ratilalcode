import React, { useState, useEffect } from "react";
import { User2, Star, TrendingUp, ChevronUp, Mail, Phone, MapPin, Calendar, Search, Edit, Trash2, Plus } from "lucide-react";
import CreatableSelect from 'react-select/creatable';
import { API_URL } from '../../config';

// Comprehensive Vendor Registration Modal for Admin
const AddVendorModal = ({ open, onClose, onAdd, loading, vendors, editMode = false, existingVendor = null }) => {
  const [form, setForm] = useState({
    // Basic Information
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zip: "",
    
    // Company Information
    company: "",
    registrationNumber: "",
    taxId: "",
    contact_person: "",
    contact_designation: "",
    
    // Files
    profile_picture: null,
    profilePicturePreview: null,
    businessLicenseFile: null,
    
    // Vendor Settings
    vendor_type: "regular", // regular, preferred, strategic
    status: "active",
    tags: [],
    preferences: {},
    role: ""
  });

  const [error, setError] = useState("");
  const [roles, setRoles] = useState([]);
  const [vendors_list, setVendorsList] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorUsers, setVendorUsers] = useState([]); // Users with vendor roles

  useEffect(() => {
    if (open) {
      fetchVendorsForSelection();
      if (editMode && existingVendor) {
        setForm({
          name: existingVendor.name || "",
          email: existingVendor.email || "",
          phone: existingVendor.phone || "",
          address: existingVendor.address || "",
          city: existingVendor.city || "",
          state: existingVendor.state || "",
          country: existingVendor.country || "",
          zip: existingVendor.zip || "",
          company: existingVendor.company || "",
          registrationNumber: existingVendor.registrationNumber || "",
          taxId: existingVendor.taxId || "",
          contact_person: existingVendor.contact_person || "",
          contact_designation: existingVendor.contact_designation || "",
          profile_picture: null,
          profilePicturePreview: existingVendor.avatar_url || null,
          businessLicenseFile: null,
          vendor_type: existingVendor.vendor_type || "regular",
          status: existingVendor.status || "active",
          tags: existingVendor.tags || [],
          preferences: existingVendor.preferences || {},
          role: ""
        });
        setSelectedVendor(null);
      } else {
        setForm({
          name: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          state: "",
          country: "",
          zip: "",
          company: "",
          registrationNumber: "",
          taxId: "",
          contact_person: "",
          contact_designation: "",
          profile_picture: null,
          profilePicturePreview: null,
          businessLicenseFile: null,
          vendor_type: "regular",
          status: "active",
          tags: [],
          preferences: {},
          role: ""
        });
        setSelectedVendor(null);
      }
      setError("");
    }
  }, [open, editMode, existingVendor]);

  const fetchVendorsForSelection = async () => {
    try {
      const token = localStorage.getItem('access_token');
      console.log('Token from localStorage:', token ? 'Token exists' : 'No token found');
      
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      console.log('Using token for requests: Token available');

      // Fetch roles (same endpoint as customer management)
      const rolesResponse = await fetch(`${API_URL}/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Roles response status:', rolesResponse.status);

      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        console.log('Roles fetched:', rolesData);
        setRoles(rolesData);

        // Find vendor roles - check for both lowercase and proper case
        const vendorRoles = rolesData.filter(role => 
          role.name && (
            role.name.toLowerCase().includes('vendor') ||
            role.name.toLowerCase() === 'vendor'
          )
        );
        console.log('Vendor roles found:', vendorRoles);

        // Fetch all users (same endpoint as customer management)
        const usersResponse = await fetch(`${API_URL}/users/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Users response status:', usersResponse.status);

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          console.log('All users fetched:', usersData);
          
          // Filter users with vendor roles - check multiple possible role structures
          let usersWithVendorRoles = [];
          
          if (vendorRoles.length > 0) {
            const vendorRoleIds = vendorRoles.map(role => role.id);
            const vendorRoleNames = vendorRoles.map(role => role.name.toLowerCase());
            
            usersWithVendorRoles = usersData.filter(user => {
              // Check role_ids array
              if (user.role_ids && user.role_ids.some(roleId => vendorRoleIds.includes(roleId))) {
                return true;
              }
              
              // Check role name directly (for direct role assignment)
              if (user.role && vendorRoleNames.includes(user.role.toLowerCase())) {
                return true;
              }
              
              // Check roles array if it exists
              if (user.roles && Array.isArray(user.roles)) {
                return user.roles.some(role => 
                  vendorRoleNames.includes((typeof role === 'string' ? role : role.name || '').toLowerCase())
                );
              }
              
              return false;
            });
          } else {
            // Fallback: look for users with 'vendor' in their role field directly
            usersWithVendorRoles = usersData.filter(user => 
              (user.role && user.role.toLowerCase().includes('vendor')) ||
              (user.roles && Array.isArray(user.roles) && 
               user.roles.some(role => 
                 (typeof role === 'string' ? role : role.name || '').toLowerCase().includes('vendor')
               ))
            );
          }
          
          console.log('Users with vendor roles:', usersWithVendorRoles);
          setVendorUsers(usersWithVendorRoles);
        }
      }

      // Fetch existing vendors for selection (using the same endpoint as main vendor list)
      const vendorsResponse = await fetch(`${API_URL}/vendors/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Vendors response status:', vendorsResponse.status);

      if (vendorsResponse.ok) {
        const vendorsData = await vendorsResponse.json();
        console.log('Existing vendors fetched:', vendorsData);
        setVendorsList(vendorsData);
      }

    } catch (error) {
      console.error('Error fetching data for vendor selection:', error);
    }
  };

  // Vendor options for React Select (all vendors)
  const getVendorOptions = () => {
    return vendors_list.map(vendor => ({
      value: vendor.id || vendor.vendor_id,
      label: `${vendor.name} (${vendor.email || 'No email'})`,
      vendor: vendor,
      __isNew__: false,
      __isUser__: false
    }));
  };

  // Vendor users options for React Select (users with vendor roles)
  const getVendorUserOptions = () => {
    return vendorUsers.map(user => {
      // Find the vendor role name - handle different role structures
      let vendorRoleName = 'vendor';
      
      // Check role_ids array first
      if (user.role_ids && user.role_ids.length > 0) {
        const userVendorRole = roles.find(role => 
          user.role_ids.includes(role.id) && 
          role.name && 
          (role.name.toLowerCase().includes('vendor') || role.name.toLowerCase() === 'vendor')
        );
        if (userVendorRole) {
          vendorRoleName = userVendorRole.name;
        }
      }
      
      // Check direct role field
      if (user.role && user.role.toLowerCase().includes('vendor')) {
        vendorRoleName = user.role;
      }
      
      // Check roles array
      if (user.roles && Array.isArray(user.roles)) {
        const vendorRole = user.roles.find(role => 
          (typeof role === 'string' ? role : role.name || '').toLowerCase().includes('vendor')
        );
        if (vendorRole) {
          vendorRoleName = typeof vendorRole === 'string' ? vendorRole : vendorRole.name;
        }
      }
      
      return {
        value: user.id || user.user_id,
        label: `${user.name || user.username} (${user.email}) - ${vendorRoleName}`,
        user: user,
        __isNew__: false,
        __isUser__: true,
        role: vendorRoleName
      };
    });
  };

  // Combined and deduplicated options
  const getCombinedUniqueOptions = () => {
    const vendorOptions = getVendorOptions();
    const userOptions = getVendorUserOptions();
    
    // Combine and remove duplicates based on email
    const allOptions = [...vendorOptions, ...userOptions];
    const uniqueOptions = [];
    const seenEmails = new Set();
    
    allOptions.forEach(option => {
      const email = option.vendor?.email || option.user?.email;
      if (email && !seenEmails.has(email)) {
        seenEmails.add(email);
        uniqueOptions.push(option);
      } else if (!email) {
        // Add options without email (shouldn't happen but just in case)
        uniqueOptions.push(option);
      }
    });
    
    return uniqueOptions;
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === "file") {
      if (name === "profile_picture") {
        if (files && files[0]) {
          const file = files[0];

          if (!file.type.match("image.*")) {
            setError("Please select an image file (JPEG, PNG, etc.)");
            return;
          }

          if (file.size > 5 * 1024 * 1024) {
            setError("File size should be less than 5MB");
            return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            setForm((prev) => ({
              ...prev,
              profile_picture: file,
              profilePicturePreview: reader.result,
            }));
          };

          reader.readAsDataURL(file);
        } else {
          setForm((prev) => ({
            ...prev,
            profile_picture: null,
            profilePicturePreview: null,
          }));
        }
      } else if (name === "businessLicenseFile") {
        if (files && files[0]) {
          const file = files[0];
          const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
          
          if (!allowedTypes.includes(file.type)) {
            setError("Please select a valid file (PDF, JPG, PNG)");
            return;
          }

          if (file.size > 10 * 1024 * 1024) {
            setError("Business license file size should be less than 10MB");
            return;
          }

          setForm((prev) => ({
            ...prev,
            businessLicenseFile: file,
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            businessLicenseFile: null,
          }));
        }
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    setError("");
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) => /^\+?[0-9\s\-().]{7,25}$/.test(phone);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.address.trim()) {
      setError("Please fill all required fields (Name, Email, Phone, Address).");
      return;
    }

    if (!form.company.trim()) {
      setError("Company name is required.");
      return;
    }

    if (!editMode && !form.registrationNumber.trim()) {
      setError("Registration number is required for new vendors.");
      return;
    }

    if (!form.contact_person.trim()) {
      setError("Contact person is required.");
      return;
    }

    // Email validation
    if (!validateEmail(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Phone validation
    if (!validatePhone(form.phone)) {
      setError("Please enter a valid phone number.");
      return;
    }

    // Business license validation for new vendors
    if (!editMode && !form.businessLicenseFile) {
      setError("Business license file is required for new vendors.");
      return;
    }

    // Check for duplicate email
    if (!editMode) {
      const formEmail = form.email.trim().toLowerCase();
      const duplicate = vendors.find((v) => (v.email || "").trim().toLowerCase() === formEmail);
      if (duplicate) {
        setError("A vendor with this email already exists.");
        return;
      }
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('email', form.email);
    formData.append('phone', form.phone);
    formData.append('address', form.address);
    formData.append('city', form.city);
    formData.append('state', form.state);
    formData.append('country', form.country);
    formData.append('zip', form.zip);
    formData.append('company', form.company);
    formData.append('registrationNumber', form.registrationNumber);
    formData.append('taxId', form.taxId);
    formData.append('contact_person', form.contact_person);
    formData.append('contact_designation', form.contact_designation);
    formData.append('vendor_type', form.vendor_type);
    formData.append('status', form.status);
    formData.append('tags', Array.isArray(form.tags) ? form.tags.join(",") : form.tags);
    formData.append('preferences', typeof form.preferences === "string" ? form.preferences : JSON.stringify(form.preferences));
    
    // Files
    if (form.profile_picture instanceof File) {
      formData.append('profile_picture', form.profile_picture);
    }
    if (form.businessLicenseFile instanceof File) {
      formData.append('businessLicense', form.businessLicenseFile);
    }

    try {
      const response = await onAdd(formData);
      if (response && response.error) {
        setError(response.error);
        return;
      }
      onClose();
    } catch (err) {
      setError("Something went wrong while adding/updating the vendor.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-700 font-medium">{editMode ? "Updating vendor..." : "Adding vendor..."}</p>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[100vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-600 px-8 py-6 relative">
          <button
            className="absolute top-4 right-4 text-white hover:text-red-300 text-2xl transition-colors w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <User2 className="text-white text-2xl" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">{editMode ? "Edit Vendor" : "Vendor Registration"}</h2>
              <p className="text-green-100 text-lg">{editMode ? "Update vendor profile details" : "Complete vendor registration with business details and documentation"}</p>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-8">
          <form onSubmit={handleSubmit}>
            {/* Personal Information */}
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl border border-blue-200 shadow-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <User2 className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      name="company"
                      required
                      value={form.company}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Company Name"
                    />
                  ) : (
                    <>
                      <CreatableSelect
                        value={selectedVendor}
                        onChange={(selectedOption) => {
                          console.log('Selected vendor option:', selectedOption);
                          setSelectedVendor(selectedOption);
                          
                          if (selectedOption) {
                            if (selectedOption.__isNew__) {
                              // New vendor - just set the company name
                              setForm(prev => ({
                                ...prev,
                                company: selectedOption.label,
                                name: '',
                                email: '',
                                phone: '',
                                address: '',
                                city: '',
                                state: '',
                                country: '',
                                zip: '',
                                contact_person: '',
                                contact_designation: '',
                                vendor_type: 'regular'
                              }));
                            } else if (selectedOption.__isUser__) {
                              // User with vendor role - auto-fill from user data
                              const user = selectedOption.user;
                              setForm(prev => ({
                                ...prev,
                                company: user.company || selectedOption.label.split(' (')[0],
                                name: user.name || user.username,
                                email: user.email,
                                phone: user.phone || '',
                                address: user.address || '',
                                city: user.city || '',
                                state: user.state || '',
                                country: user.country || '',
                                zip: user.zip || '',
                                contact_person: user.name || user.username,
                                contact_designation: user.job_title || '',
                                vendor_type: 'regular',
                                role: selectedOption.role
                              }));
                            } else {
                              // Existing vendor - auto-fill vendor data
                              const vendor = selectedOption.vendor;
                              setForm(prev => ({
                                ...prev,
                                company: vendor.company || vendor.name,
                                name: vendor.name,
                                email: vendor.email,
                                phone: vendor.phone || '',
                                address: vendor.address || '',
                                city: vendor.city || '',
                                state: vendor.state || '',
                                country: vendor.country || '',
                                zip: vendor.zip || '',
                                contact_person: vendor.contact_person || vendor.name,
                                contact_designation: vendor.contact_designation || '',
                                vendor_type: vendor.vendor_type || 'regular'
                              }));
                            }
                          } else {
                            // Clear selection - reset form
                            setForm(prev => ({
                              ...prev,
                              company: '',
                              name: '',
                              email: '',
                              phone: '',
                              address: '',
                              city: '',
                              state: '',
                              country: '',
                              zip: '',
                              contact_person: '',
                              contact_designation: '',
                              vendor_type: 'regular',
                              role: ''
                            }));
                          }
                        }}
                        options={getCombinedUniqueOptions()}
                        isClearable
                        isSearchable
                        placeholder={form.role ? `Search vendors with '${form.role}' role or existing vendors...` : "Search existing vendors/users or type new company name..."}
                        className="text-sm"
                        styles={{
                          control: (provided) => ({
                            ...provided,
                            minHeight: '48px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            '&:hover': {
                              border: '1px solid #9ca3af'
                            },
                            '&:focus-within': {
                              border: '2px solid #10b981',
                              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.1)'
                            }
                          })
                        }}
                        formatCreateLabel={(inputValue) => `Create new vendor: "${inputValue}"`}
                        noOptionsMessage={() => "No vendors/users found - type to create new"}
                      />
                      {selectedVendor && !selectedVendor.__isNew__ && !selectedVendor.__isUser__ && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <span className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </span>
                          Existing vendor selected - details auto-filled
                        </p>
                      )}
                      {selectedVendor && selectedVendor.__isUser__ && (
                        <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                          <User2 className="w-3 h-3 text-blue-500" />
                          User with vendor role selected - creating vendor profile
                        </p>
                      )}
                      {selectedVendor && selectedVendor.__isNew__ && (
                        <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                          <Plus className="w-3 h-3 text-blue-500" />
                          Creating new vendor - fill in the details below
                        </p>
                      )}
                      {!selectedVendor && (
                        <p className="text-xs text-gray-500 mt-2">Search for existing vendors, users with vendor roles, or type a new company name</p>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Full Name of Contact Person"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person Role <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="contact_person"
                    required
                    value={form.contact_person}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Primary Contact Person"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="example@company.com"
                    disabled={!editMode && !!(selectedVendor && (!selectedVendor.__isNew__ || selectedVendor.__isUser__))}
                  />
                  {selectedVendor && !selectedVendor.__isNew__ && !selectedVendor.__isUser__ && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <span className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </span>
                      Auto-filled from selected vendor
                    </p>
                  )}
                  {selectedVendor && selectedVendor.__isUser__ && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <User2 className="w-3 h-3 text-blue-500" />
                      Auto-filled from selected user
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl border border-green-200 shadow-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Address Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={form.address}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Street Address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP/Postal Code</label>
                  <input
                    type="text"
                    name="zip"
                    value={form.zip}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="ZIP/Postal Code"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>

            {/* Professional Info */}
            <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl border border-purple-200 shadow-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Professional Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Registration Number {!editMode && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    name="registrationNumber"
                    required={!editMode}
                    value={form.registrationNumber}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Business Registration Number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID (Optional)</label>
                  <input
                    type="text"
                    name="taxId"
                    value={form.taxId}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Tax Identification Number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Designation</label>
                  <input
                    type="text"
                    name="contact_designation"
                    value={form.contact_designation}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="CEO, Manager, Director, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Type</label>
                  <select
                    name="vendor_type"
                    value={form.vendor_type}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="regular">Regular</option>
                    <option value="preferred">Preferred</option>
                    <option value="strategic">Strategic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Business License Upload */}
            {!editMode && (
              <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl border border-red-200 shadow-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Business License <span className="text-red-500">*</span></h3>
                </div>
                <div className="border-2 border-dashed border-red-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors cursor-pointer">
                  <label className="cursor-pointer flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                      <Plus className="text-red-500 text-xl" />
                    </div>
                    <span className="text-sm text-gray-600 font-medium">Upload Business License Document</span>
                    <span className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (max. 10MB)</span>
                    {form.businessLicenseFile && (
                      <span className="text-sm text-green-600 mt-2 font-medium">
                        ✓ {form.businessLicenseFile.name}
                      </span>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.png,.jpeg"
                      name="businessLicenseFile"
                      onChange={handleChange}
                      className="hidden"
                      required={!editMode}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-600 mt-2">Upload your official business license document for verification</p>
              </div>
            )}

            {/* Profile Picture Upload */}
            <div className="bg-gradient-to-br from-white to-orange-50 rounded-2xl border border-orange-200 shadow-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <User2 className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Profile Picture (Optional)</h3>
              </div>
              <div className="flex items-start space-x-6">
                <div className="flex-grow">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors cursor-pointer"
                  >
                    <label className="cursor-pointer flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Plus className="text-gray-500 text-xl" />
                      </div>
                      <span className="text-sm text-gray-600 font-medium">Click to upload profile picture</span>
                      <span className="text-xs text-gray-500 mt-1">SVG, PNG, JPG or GIF (max. 5MB)</span>
                      <input
                        type="file"
                        accept="image/svg+xml,image/png,image/jpeg,image/gif"
                        name="profile_picture"
                        onChange={handleChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <div className="w-32 h-32 rounded-xl border border-green-300 shadow-sm overflow-hidden flex items-center justify-center">
                  {form.profilePicturePreview ? (
                    <img src={form.profilePicturePreview} alt="Profile Preview" className="object-cover w-full h-full" />
                  ) : (
                    <div className="text-green-300 text-center select-none">No image</div>
                  )}
                </div>
              </div>
            </div>

            {error && <p className="text-red-600 text-center mb-3">{error}</p>}

            <div className="flex justify-end gap-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg transform hover:scale-105"
              >
                {loading ? (editMode ? "Updating..." : "Registering...") : (editMode ? "Update Vendor" : "Register Vendor")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


// Vendor Detail Card
const VendorDetailCard = ({ vendor, onClose }) => {
  if (!vendor) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-600 px-8 py-6 relative">
          <button
            className="absolute top-4 right-4 text-white hover:text-red-300 text-2xl transition-colors z-10 w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
          <div className="flex items-center gap-6">
            <div className="relative">
              <img
                src={vendor.avatar_url || "/default-avatar.png"}
                alt={vendor.name}
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white ring-opacity-30"
              />
              <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-white ${
                vendor.status === 'active' ? 'bg-green-400' : 
                vendor.status === 'inactive' ? 'bg-yellow-400' : 'bg-red-400'
              }`}></div>
            </div>
            <div className="text-white">
              <h2 className="text-3xl font-bold mb-2">{vendor.name}</h2>
              <div className="flex items-center gap-4 text-green-100">
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">ID: {vendor.id}</span>
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm capitalize">{vendor.vendor_type}</span>
                <span className={`px-3 py-1 rounded-full text-sm capitalize ${
                  vendor.status === 'active' ? 'bg-green-400 text-green-900' :
                  vendor.status === 'inactive' ? 'bg-yellow-400 text-yellow-900' :
                  'bg-red-400 text-red-900'
                }`}>{vendor.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-1">₹{vendor.total_spend?.toFixed(2) || "0.00"}</div>
              <div className="text-blue-600 font-medium">Total Spend</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-1">{vendor.orders_count || 0}</div>
              <div className="text-purple-600 font-medium">Orders Count</div>
            </div>
          </div>

          {/* Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Contact Information</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-gray-400 mt-1" />
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <div className="font-medium text-gray-900">{vendor.email || "N/A"}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-gray-400 mt-1" />
                  <div>
                    <div className="text-sm text-gray-500">Phone</div>
                    <div className="font-medium text-gray-900">{vendor.phone || "N/A"}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                  <div>
                    <div className="text-sm text-gray-500">Address</div>
                    <div className="font-medium text-gray-900">{vendor.address || "N/A"}</div>
                    {(vendor.city || vendor.state || vendor.country) && (
                      <div className="text-sm text-gray-600">
                        {[vendor.city, vendor.state, vendor.country].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <User2 className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Professional Details</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Company</div>
                  <div className="font-medium text-gray-900">{vendor.company || "N/A"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Contact Person</div>
                  <div className="font-medium text-gray-900">{vendor.contact_person || "N/A"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Designation</div>
                  <div className="font-medium text-gray-900">{vendor.contact_designation || "N/A"}</div>
                </div>
                {vendor.tags && vendor.tags.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {vendor.tags.map((tag, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Additional Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Member Since</div>
                <div className="font-medium text-gray-900">
                  {new Date(vendor.created_at || vendor.joined_at || vendor.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              {vendor.preferences && Object.keys(vendor.preferences).length > 0 && (
                <div>
                  <div className="text-sm text-gray-500">Preferences</div>
                  <div className="font-medium text-gray-900 text-sm">
                    {JSON.stringify(vendor.preferences, null, 2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// Main Vendor Profile Component
const VendorProfile = () => {
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [detailViewVendor, setDetailViewVendor] = useState(null);
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch vendors on mount
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/vendors/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch vendors");
      const data = await res.json();

      const API_BASE = API_URL.replace("/api", "");
      const processed = Array.isArray(data)
        ? data.map((v) => {
            let avatar_url = v.profile_picture || v.avatar_url;
            if (avatar_url && avatar_url.startsWith("/")) {
              avatar_url = API_BASE + avatar_url;
            }
            return {
              ...v,
              id: v.id || v._id,
              name: v.name,
              avatar_url,
              total_spend: v.total_spend || 0,
              orders_count: v.orders_count || 0,
              status: v.status || "active",
            };
          })
        : [];
      setVendors(processed);
      setFilteredVendors(processed);
    } catch (e) {
      console.error("Error fetching vendors:", e);
      setVendors([]);
      setFilteredVendors([]);
    }
    setLoading(false);
  };

  const handleAddVendor = async (formData) => {
    setAdding(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/vendors/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 409) {
          setAdding(false);
          return { error: "A vendor with this name and email already exists." };
        }
        const errorData = await res.json();
        let errorMsg = "Failed to add vendor";
        if (Array.isArray(errorData)) errorMsg = errorData.map(e => e.msg).join(", ");
        else if (errorData.detail) errorMsg = errorData.detail;
        setAdding(false);
        return { error: errorMsg };
      }
      await fetchVendors();
      setAddModal(false);
      setAdding(false);
      return {};
    } catch (err) {
      console.error("Error adding vendor:", err);
      setAdding(false);
      return { error: "Failed to add vendor" };
    }
  };

  const handleEditVendor = async (id, formData) => {
    setAdding(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/vendors/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        let errorMsg = "Failed to update vendor";
        if (Array.isArray(errorData)) errorMsg = errorData.map(e => e.msg).join(", ");
        else if (errorData.detail) errorMsg = errorData.detail;
        setAdding(false);
        return { error: errorMsg };
      }
      await fetchVendors();
      setEditingVendor(null);
      setAddModal(false);
      setAdding(false);
      return {};
    } catch (err) {
      console.error("Error updating vendor:", err);
      setAdding(false);
      return { error: "Failed to update vendor" };
    }
  };

  const handleDeleteVendor = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/vendors/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete vendor");
      await fetchVendors();
    } catch (e) {
      console.error("Error deleting vendor:", e);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    if (!term) {
      setFilteredVendors(vendors);
      return;
    }
    const filtered = vendors.filter(vendor =>
      (vendor.name || "").toLowerCase().includes(term) ||
      (vendor.email || "").toLowerCase().includes(term) ||
      (vendor.company || "").toLowerCase().includes(term) ||
      (vendor.vendor_type || "").toLowerCase().includes(term)
    );
    setFilteredVendors(filtered);
  };

  // Metrics
  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v) => (v.status || "active").toLowerCase() === "active").length;
  const preferredVendors = vendors.filter((v) => v.vendor_type === "preferred").length;
  const totalSpend = vendors.reduce((sum, v) => sum + (v.total_spend || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      {/* Header Section with Gradient */}
      <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-600 rounded-3xl shadow-2xl p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-3 tracking-tight">Vendor Management</h1>
            <p className="text-green-100 text-lg">Manage your vendors, update their details, and review vendor metrics</p>
          </div>
          <div className="hidden lg:block">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <User2 className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards with Beautiful Gradients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-all duration-300 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <User2 className="w-6 h-6" />
            </div>
            <div className="text-right">
              <h3 className="text-3xl font-bold">{totalVendors}</h3>
              <p className="text-blue-100 font-medium">Total Vendors</p>
            </div>
          </div>
          <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
            <div className="bg-white bg-opacity-60 h-2 rounded-full" style={{width: '85%'}}></div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-all duration-300 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Star className="w-6 h-6" />
            </div>
            <div className="text-right">
              <h3 className="text-3xl font-bold">{activeVendors}</h3>
              <p className="text-green-100 font-medium">Active Vendors</p>
            </div>
          </div>
          <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
            <div className="bg-white bg-opacity-60 h-2 rounded-full" style={{width: `${totalVendors > 0 ? (activeVendors/totalVendors*100) : 0}%`}}></div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-all duration-300 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="text-right">
              <h3 className="text-3xl font-bold">{preferredVendors}</h3>
              <p className="text-purple-100 font-medium">Preferred Vendors</p>
            </div>
          </div>
          <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
            <div className="bg-white bg-opacity-60 h-2 rounded-full" style={{width: `${totalVendors > 0 ? (preferredVendors/totalVendors*100) : 0}%`}}></div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-all duration-300 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <ChevronUp className="w-6 h-6" />
            </div>
            <div className="text-right">
              <h3 className="text-3xl font-bold">₹{totalSpend.toFixed(2)}</h3>
              <p className="text-orange-100 font-medium">Total Spend</p>
            </div>
          </div>
          <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
            <div className="bg-white bg-opacity-60 h-2 rounded-full" style={{width: '92%'}}></div>
          </div>
        </div>
      </div>

      {/* Search and Actions Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search vendors by name, email, company, or type..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
            />
          </div>
          <button
            onClick={() => {
              setEditingVendor(null);
              setAddModal(true);
            }}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 rounded-xl flex items-center gap-3 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <Plus className="w-5 h-5" /> Add New Vendor
          </button>
        </div>
        
        {/* Quick Stats */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Showing {filteredVendors.length} of {totalVendors} vendors</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-green-600">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Active: {activeVendors}
              </span>
              <span className="flex items-center gap-2 text-purple-600">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                Preferred: {preferredVendors}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Vendor Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Vendor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Total Spend</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Orders</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Joined</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                    <p className="text-gray-500 font-medium">Loading vendors...</p>
                  </div>
                </td>
              </tr>
            ) : filteredVendors.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <User2 className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No vendors found</p>
                    <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 transition-all duration-200">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      #{vendor.id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={vendor.avatar_url || "/default-avatar.png"}
                          alt={vendor.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          vendor.status === 'active' ? 'bg-green-500' : 
                          vendor.status === 'inactive' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{vendor.name}</div>
                        <div className="text-sm text-gray-500">{vendor.email}</div>
                        {vendor.company && <div className="text-xs text-gray-400">{vendor.company}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      vendor.vendor_type === 'preferred' ? 'bg-purple-100 text-purple-800' :
                      vendor.vendor_type === 'strategic' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {vendor.vendor_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      vendor.status === 'active' ? 'bg-green-100 text-green-800' :
                      vendor.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">₹{vendor.total_spend?.toFixed(2) || "0.00"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{vendor.orders_count || 0}</span>
                      <span className="text-xs text-gray-500">orders</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {new Date(vendor.created_at || vendor.joined_at || vendor.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setDetailViewVendor(vendor)}
                        title="View Details"
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <User2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingVendor(vendor);
                          setAddModal(true);
                        }}
                        title="Edit Vendor"
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteVendor(vendor.id)}
                        title="Delete Vendor"
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
      </div>

      <AddVendorModal
        open={addModal}
        onClose={() => {
          setAddModal(false);
          setEditingVendor(null);
        }}
        onAdd={(formData) => {
          if (editingVendor) {
            return handleEditVendor(editingVendor.id, formData);
          }
          return handleAddVendor(formData);
        }}
        loading={adding}
        vendors={vendors}
        editMode={!!editingVendor}
        existingVendor={editingVendor}
      />

      {detailViewVendor && (
        <VendorDetailCard
          vendor={detailViewVendor}
          onClose={() => setDetailViewVendor(null)}
        />
      )}
    </div>
  );
};

export default VendorProfile;
