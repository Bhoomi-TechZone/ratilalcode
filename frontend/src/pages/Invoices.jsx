import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { 
  FileText, DollarSign, Clock, User2, CheckCircle, XCircle, 
  Loader2, AlertCircle, Download, Printer, Edit3, Trash2, Plus 
} from "lucide-react";
import { usePermissions } from "../components/contexts/PermissionContext.jsx";
import { INVOICE_API, getAuthHeaders } from "../config.js";

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount || 0);
}

function statusColor(status) {
  const colors = {
    draft: "text-gray-600 bg-gray-50 border-gray-200",
    sent: "text-blue-700 bg-blue-50 border-blue-200",
    paid: "text-green-600 bg-green-50 border-green-200",
    partial: "text-yellow-700 bg-yellow-50 border-yellow-200",
    overdue: "text-red-600 bg-red-50 border-red-200"
  };
  return colors[status?.toLowerCase()] || "text-gray-600 bg-gray-50 border-gray-200";
}

export default function Invoices() {
  const { userPermissions } = usePermissions();
  const { invoice_id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [invoices, setInvoices] = useState([]);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    status: [],
    overdue: false,
    customer_id: ""
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [newInvoice, setNewInvoice] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
    tax_rate: 18,
    due_days: 30
  });

  // Check permissions - allow admin users or users with specific permission
  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : null;
  const isAdmin = userObj?.roles?.includes("admin") || false;
  const hasAccountsAccess = isAdmin || userPermissions?.includes("invoices:access") || false;

  // Fetch invoices list
  const fetchInvoices = useCallback(async () => {
    if (!hasAccountsAccess) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page,
        limit: 10,
        ...filters
      });
      
      const res = await fetch(`${INVOICE_API.LIST}?${params}`, {
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [page, filters, hasAccountsAccess]);

  // Fetch single invoice
  const fetchInvoice = useCallback(async () => {
    if (!invoice_id || !hasAccountsAccess) return;
    
    setLoading(true);
    try {
      const res = await fetch(INVOICE_API.GET_INVOICE(invoice_id), {
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        const data = await res.json();
        setCurrentInvoice(data);
      }
    } catch (error) {
      console.error("Failed to fetch invoice:", error);
    } finally {
      setLoading(false);
    }
  }, [invoice_id, hasAccountsAccess]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!hasAccountsAccess) return;
    
    try {
      const res = await fetch(INVOICE_API.STATS, {
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, [hasAccountsAccess]);

  useEffect(() => {
    if (invoice_id) {
      fetchInvoice();
    } else {
      fetchStats();
      fetchInvoices();
    }
  }, [invoice_id, fetchInvoice, fetchInvoices, fetchStats]);

  const markPaid = async (invoiceId) => {
    try {
      const res = await fetch(INVOICE_API.MARK_PAID(invoiceId), {
        method: "POST",
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        fetchInvoices();
        if (currentInvoice?.id === invoiceId) {
          fetchInvoice();
        }
      }
    } catch (error) {
      console.error("Failed to mark paid:", error);
    }
  };

  const deleteInvoice = async (invoiceId) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    
    try {
      const res = await fetch(INVOICE_API.DELETE(invoiceId), {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        fetchInvoices();
        if (currentInvoice?.id === invoiceId) {
          navigate("/invoices");
        }
      }
    } catch (error) {
      console.error("Failed to delete invoice:", error);
    }
  };

  const editInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setNewInvoice({
      customer_name: invoice.customer_name || '',
      customer_email: invoice.customer_email || '',
      customer_phone: invoice.customer_phone || '',
      customer_address: invoice.customer_address || '',
      items: invoice.items?.map(item => ({
        description: item.description || item.name || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0
      })) || [{ description: '', quantity: 1, unit_price: 0 }],
      tax_rate: 18,
      due_days: 30
    });
    setShowCreateModal(true);
  };

  const generateInvoice = async () => {
    try {
      // Calculate totals
      const subtotal = newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const tax_amount = (subtotal * newInvoice.tax_rate) / 100;
      const total_amount = subtotal + tax_amount;
      
      // Transform items to match backend schema, filtering out empty items
      const transformedItems = newInvoice.items
        .filter(item => item.description && item.description.trim() !== '' && item.unit_price > 0)
        .map(item => ({
          name: item.description,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: newInvoice.tax_rate
        }));
      
      // Validate that we have at least one valid item
      if (transformedItems.length === 0) {
        alert("Please add at least one valid item with description and price.");
        return;
      }
      
      // Recalculate totals based on filtered items
      const filteredSubtotal = transformedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const filteredTaxAmount = (filteredSubtotal * newInvoice.tax_rate) / 100;
      const filteredTotalAmount = filteredSubtotal + filteredTaxAmount;
      
      const invoiceData = {
        customer_id: editingInvoice?.customer_id || "dummy-customer-id",
        customer_name: newInvoice.customer_name,
        customer_email: newInvoice.customer_email,
        customer_phone: newInvoice.customer_phone,
        customer_address: newInvoice.customer_address,
        items: transformedItems,
        subtotal: filteredSubtotal,
        tax_amount: filteredTaxAmount,
        total_amount: filteredTotalAmount,
        due_date: new Date(Date.now() + newInvoice.due_days * 24 * 60 * 60 * 1000).toISOString(),
        notes: newInvoice.notes || '',
        status: editingInvoice?.status || 'draft'
      };
      
      // Add invoice_number only for new invoices (backend will auto-generate)
      if (!editingInvoice) {
        invoiceData.invoice_number = `INV-${Date.now().toString().slice(-6)}`;
      }
      
      const url = editingInvoice ? INVOICE_API.UPDATE(editingInvoice.id) : INVOICE_API.CREATE;
      const method = editingInvoice ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(invoiceData)
      });
      
      if (res.ok) {
        setShowCreateModal(false);
        setEditingInvoice(null);
        setNewInvoice({
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          customer_address: '',
          items: [{ description: '', quantity: 1, unit_price: 0 }],
          tax_rate: 18,
          due_days: 30
        });
        fetchInvoices();
        fetchStats();
      }
    } catch (error) {
      console.error("Failed to create invoice:", error);
    }
  };

  const addItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unit_price: 0 }]
    }));
  };

  const removeItem = (index) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  if (!hasAccountsAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-8">You need invoices:access permission</p>
          <button 
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // List View
  if (!invoice_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-8xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Invoices
                </h1>
                <p className="text-xl text-gray-600 mt-2">Manage billing and payments</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-2xl shadow-xl hover:from-emerald-600 hover:to-emerald-700 transition-all whitespace-nowrap"
              >
                + New Invoice
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Draft</p>
                    <p className="text-3xl font-black text-gray-900">{stats.total_draft || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-red-200 rounded-2xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Overdue</p>
                    <p className="text-3xl font-black text-red-600">{stats.total_overdue || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Unpaid</p>
                    <p className="text-3xl font-black text-blue-600">{stats.total_unpaid || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-green-200 rounded-2xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Paid</p>
                    <p className="text-3xl font-black text-green-600">₹{(stats.total_paid || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters & Table */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-8">
            <div className="flex flex-col lg:flex-row gap-4 mb-8 items-center lg:items-end">
              <div className="flex flex-wrap gap-3">
                <select className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500">
                  <option>All Status</option>
                  <option>Draft</option>
                  <option>Sent</option>
                  <option>Paid</option>
                </select>
                <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm font-medium">Overdue</span>
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <input 
                  type="text" 
                  placeholder="Search by customer or invoice number..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 font-semibold text-gray-800">#</th>
                    <th className="text-left py-4 font-semibold text-gray-800">Customer</th>
                    <th className="text-left py-4 font-semibold text-gray-800">Amount</th>
                    <th className="text-left py-4 font-semibold text-gray-800">Due Date</th>
                    <th className="text-left py-4 font-semibold text-gray-800">Status</th>
                    <th className="text-right py-4 font-semibold text-gray-800">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                        <p>Loading invoices...</p>
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-20 text-center text-gray-500">
                        No invoices found
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 font-mono text-sm font-semibold text-gray-900">
                          {invoice.invoice_number}
                        </td>
                        <td className="py-4">
                          <div className="font-medium text-gray-900">{invoice.customer_name || 'N/A'}</div>
                          {invoice.customer_email && (
                            <div className="text-sm text-gray-500">{invoice.customer_email}</div>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="text-2xl font-bold text-gray-900">
                            {formatCurrency(invoice.total_amount)}
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            new Date(invoice.due_date) < new Date() 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {formatDate(invoice.due_date)}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`px-4 py-2 rounded-full text-sm font-bold border ${statusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-4 text-right space-x-2">
                          <button 
                            onClick={() => editInvoice(invoice)}
                            className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-xl transition-all"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          {invoice.status !== 'paid' && (
                            <button 
                              onClick={() => markPaid(invoice.id)}
                              className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-xl transition-all"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button 
                            onClick={() => deleteInvoice(invoice.id)}
                            className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 10 && (
              <div className="flex items-center justify-between mt-8">
                <div className="text-sm text-gray-600">
                  Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} invoices
                </div>
                <div className="flex gap-2">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={page * 10 >= total}
                    onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Create Invoice Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">
                      {editingInvoice ? 'Edit Invoice' : 'Generate New Invoice'}
                    </h2>
                    <button 
                      onClick={() => {
                        setShowCreateModal(false);
                        setEditingInvoice(null);
                      }}
                      className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-8">
                    {/* Customer Information */}
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">Customer Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Customer Name"
                          value={newInvoice.customer_name}
                          onChange={(e) => setNewInvoice(prev => ({...prev, customer_name: e.target.value}))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                        <input
                          type="email"
                          placeholder="Customer Email"
                          value={newInvoice.customer_email}
                          onChange={(e) => setNewInvoice(prev => ({...prev, customer_email: e.target.value}))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                        <input
                          type="tel"
                          placeholder="Customer Phone"
                          value={newInvoice.customer_phone}
                          onChange={(e) => setNewInvoice(prev => ({...prev, customer_phone: e.target.value}))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <textarea
                          placeholder="Customer Address"
                          value={newInvoice.customer_address}
                          onChange={(e) => setNewInvoice(prev => ({...prev, customer_address: e.target.value}))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Invoice Items */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-gray-800">Invoice Items</h3>
                        <button
                          onClick={addItem}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          + Add Item
                        </button>
                      </div>
                      <div className="space-y-4">
                        {newInvoice.items.map((item, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-xl">
                            <input
                              type="text"
                              placeholder="Description"
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              required
                            />
                            <input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              min="1"
                              required
                            />
                            <div className="flex gap-2">
                              <input
                                type="number"
                                placeholder="Price"
                                value={item.unit_price}
                                onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                min="0"
                                step="0.01"
                                required
                              />
                              {newInvoice.items.length > 1 && (
                                <button
                                  onClick={() => removeItem(index)}
                                  className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <div className="md:col-span-4 text-right text-lg font-semibold text-gray-700">
                              Total: ₹{(item.quantity * item.unit_price).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Invoice Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                        <input
                          type="number"
                          value={newInvoice.tax_rate}
                          onChange={(e) => setNewInvoice(prev => ({...prev, tax_rate: parseFloat(e.target.value) || 0}))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Due Days</label>
                        <input
                          type="number"
                          value={newInvoice.due_days}
                          onChange={(e) => setNewInvoice(prev => ({...prev, due_days: parseInt(e.target.value) || 30}))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                      </div>
                    </div>

                    {/* Invoice Summary */}
                    <div className="bg-gray-50 p-6 rounded-xl">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">Invoice Summary</h3>
                      {(() => {
                        const subtotal = newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
                        const tax_amount = (subtotal * newInvoice.tax_rate) / 100;
                        const total_amount = subtotal + tax_amount;
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tax ({newInvoice.tax_rate}%):</span>
                              <span className="font-semibold">₹{tax_amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold text-green-600 pt-2 border-t">
                              <span>Total:</span>
                              <span>₹{total_amount.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 justify-end">
                      <button
                        onClick={() => setShowCreateModal(false)}
                        className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={generateInvoice}
                        className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all"
                      >
                        Generate Invoice
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Single Invoice View
  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-100 via-white to-slate-100">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900">Loading Invoice</h2>
          </div>
        </div>
      ) : currentInvoice ? (
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar */}
          <aside className="bg-white lg:w-96 p-8 border-b lg:border-b-0 lg:border-r border-gray-200 shadow-lg">
            <button 
              className="mb-8 w-full flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-2xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all"
              onClick={() => navigate("/invoices")}
            >
              <span>←</span> Back to Invoices
            </button>

            <div className="text-center mb-12">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-100 to-blue-100 rounded-3xl flex items-center justify-center">
                <FileText className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">
                {currentInvoice.invoice_number}
              </h2>
              <div className={`inline-flex px-4 py-2 rounded-full text-sm font-bold border-2 ${statusColor(currentInvoice.status)}`}>
                {currentInvoice.status.toUpperCase()}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <User2 className="w-5 h-5" /> Customer
                </h4>
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <p className="font-semibold text-lg text-gray-900">{currentInvoice.customer_name}</p>
                  <p className="text-sm text-gray-600">{currentInvoice.customer_email}</p>
                  <p className="text-sm text-gray-600">{currentInvoice.customer_phone}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" /> Amount
                </h4>
                <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl border-2 border-emerald-200">
                  <p className="text-4xl font-black text-gray-900">
                    {formatCurrency(currentInvoice.total_amount)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Total (incl. tax)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Issue Date</p>
                  <p className="font-semibold">{formatDate(currentInvoice.issue_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Due Date</p>
                  <p className={`font-semibold ${
                    new Date(currentInvoice.due_date) < new Date() 
                      ? 'text-red-600' 
                      : 'text-emerald-600'
                  }`}>
                    {formatDate(currentInvoice.due_date)}
                  </p>
                </div>
              </div>

              {currentInvoice.status !== 'paid' && (
                <button 
                  onClick={() => markPaid(currentInvoice.id)}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-2xl font-bold shadow-xl hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-3"
                >
                  <CheckCircle className="w-5 h-5" />
                  Mark as Paid
                </button>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-12 mb-8">
                <h3 className="text-3xl font-black text-gray-900 mb-8 text-center">Invoice Items</h3>
                
                <div className="space-y-4 mb-12">
                  {currentInvoice.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-6 p-6 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.description}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity} × ₹{item.unit_price}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ₹{(item.quantity * item.unit_price).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-gray-200 pt-8">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-semibold text-gray-700">Subtotal:</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(currentInvoice.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xl font-semibold text-gray-700">Tax (18%):</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(currentInvoice.tax_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl">
                    <span className="text-3xl font-black text-gray-900">Total:</span>
                    <span className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                      {formatCurrency(currentInvoice.total_amount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-2xl shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all">
                  <Download className="w-5 h-5" />
                  Download PDF
                </button>
                <button className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold rounded-2xl shadow-xl hover:from-gray-600 hover:to-gray-700 transition-all">
                  <Printer className="w-5 h-5" />
                  Print
                </button>
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
            <button 
              onClick={() => navigate("/invoices")}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 mt-4"
            >
              Back to Invoices
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
