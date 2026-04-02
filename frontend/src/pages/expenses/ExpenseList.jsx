import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getExpenses } from "../../api/expense.api";
import useAuthStore from "../../app/authStore";

const filters = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const ExpenseList = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);

        const res = await getExpenses({
          status,
          page,
          limit: 20,
          search,
        });

        setExpenses(res.data.expenses || []);
        setTotalPages(res.data.totalPages || 1);
      } catch (error) {
        console.error("Expenses fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the API call
    const timer = setTimeout(() => {
      fetchExpenses();
    }, 300);

    return () => clearTimeout(timer);
  }, [status, page, search]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on new search
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setPage(1); // Reset to first page on status change
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
          Expenses
        </h1>

        <button
          onClick={() => navigate("/app/expenses/new")}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 w-full sm:w-auto"
        >
          + New Expense
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => handleStatusChange(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                status === f.value
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full lg:w-72">
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={handleSearchChange}
            className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>
      </div>

      <div className="hidden md:block bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Created At</th>

              {user?.userType === "manager" && (
                <th className="px-4 py-3 text-left">Created By</th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-4 text-gray-500">
                  No expenses found
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr
                  key={expense._id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/app/expenses/${expense._id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-700">
                    {expense.title}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {expense.department || "-"}
                  </td>

                  <td className="px-4 py-3">₹{expense.totalAmount}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs capitalize ${
                        expense.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : expense.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : expense.status === "submitted"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {expense.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {new Date(expense.createdAt).toLocaleDateString()}
                  </td>

                  {user?.userType === "manager" && (
                    <td className="px-4 py-3 text-gray-600">
                      {expense.createdBy?.name || "-"}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {expenses.map((expense) => (
          <div
            key={expense._id}
            onClick={() => navigate(`/app/expenses/${expense._id}`)}
            className="bg-white border rounded-xl p-4 shadow-sm cursor-pointer active:scale-[0.99]"
          >
            <div className="flex justify-between items-start">
              <h2 className="font-medium text-gray-800 text-sm">
                {expense.title}
              </h2>

              <span
                className={`px-2 py-1 rounded-full text-xs capitalize ${
                  expense.status === "approved"
                    ? "bg-green-100 text-green-700"
                    : expense.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : expense.status === "submitted"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                }`}
              >
                {expense.status}
              </span>
            </div>

            <div className="mt-2 text-sm text-gray-600">
              Department: {expense.department || "-"}
            </div>

            <div className="mt-1 text-sm text-gray-600">
              Amount: ₹{expense.totalAmount}
            </div>

            <div className="mt-1 text-xs text-gray-500">
              {new Date(expense.createdAt).toLocaleDateString()}
            </div>

            {user?.userType === "manager" && (
              <div className="mt-1 text-xs text-gray-500">
                Created by: {expense.createdBy?.name || "-"}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6">
        <button
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1 || loading}
          className="w-full sm:w-auto px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
        >
          Previous
        </button>

        <span className="text-sm text-gray-600">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={page === totalPages || loading}
          className="w-full sm:w-auto px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ExpenseList;
