import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getExpenseById,
  deleteExpense,
  submitExpense,
  approveExpense,
} from "../../api/expense.api";
import useAuthStore from "../../app/authStore";
import toast from "react-hot-toast";

const ExpenseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  const isOwner = expense?.createdBy?._id?.toString() === user?._id?.toString();
  const isDraft = expense?.status === "draft";
  const isManager = user?.userType === "manager";

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        setLoading(true);
        const res = await getExpenseById(id);
        setExpense(res.data.expense);
      } catch (error) {
        toast.error("Unable to fetch expense");
        navigate("/app/expenses");
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this draft expense?")) return;

    try {
      await deleteExpense(id);
      toast.success("Expense deleted");
      navigate("/app/expenses");
    } catch {
      toast.error("Expense Delete Failed");
    }
  };

  const handleSubmit = async () => {
    try {
      await submitExpense(id);
      toast.success("Expense submitted");
      navigate("/app/expenses");
    } catch {
      toast.error("Expense Submmision Failed");
    }
  };

  const handleApproval = async (decision) => {
    try {
      await approveExpense(id, { decision });
      toast.success(`Expense ${decision}`);
      navigate("/app/expenses");
    } catch {
      toast.error("Expense Approval Failed");
    }
  };


  const isSelfApproval = expense?.createdBy?._id?.toString() === user?._id?.toString(); 


  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  if (!expense) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">
          {expense.title}
        </h1>

        <span
          className={`px-3 py-1 rounded-full text-xs capitalize ${
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

      {/* Meta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 border rounded-xl">
        <Info label="Department" value={expense.department} />
        <Info label="Total Amount" value={`₹${expense.totalAmount}`} />
        <Info label="Created By" value={expense.createdBy?.name} />
        <Info
          label="Created At"
          value={new Date(expense.createdAt).toLocaleString()}
        />
      </div>

      {/* Items */}
      <div className="bg-white border rounded-xl">
        <div className="p-4 border-b font-medium text-gray-700">
          Expense Items
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Description</th>
              <th className="px-4 py-2 text-left">Qty</th>
              <th className="px-4 py-2 text-left">Unit Price</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {expense.items && expense.items.length > 0 ? (
              expense.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2">{item.description || "-"}</td>
                  <td className="px-4 py-2">{item.qty ?? "-"}</td>
                  <td className="px-4 py-2">₹{item.unitPrice ?? "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-3 text-center text-sm text-gray-500"
                >
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Attachments */}
      <div className="bg-white border rounded-xl">
        <div className="p-4 border-b font-medium text-gray-700">
          Attachments
        </div>

        {expense.attachments && expense.attachments.length > 0 ? (
          <ul className="p-4 space-y-2 text-sm">
            {expense.attachments.map((link, idx) => (
              <li key={idx}>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline break-all"
                >
                  {link}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 text-sm text-gray-500">No attachments</div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex gap-3 flex-wrap">

        <button
          onClick={() => navigate("/app/expenses")}
          className="px-6 py-2 rounded-lg border text-sm"
        >
          Back
        </button>

        {/* EMPLOYEE ACTIONS */}
        {isOwner && isDraft && (
          <>
            <button
              onClick={() => navigate(`/app/expenses/${id}/edit`)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm"
            >
              Edit
            </button>

            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm"
            >
              Delete
            </button>

            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm"
            >
              Submit
            </button>
          </>
        )}

        {/* MANAGER ACTIONS */}
        {isManager && expense.status === "submitted" && !isSelfApproval &&(
          <>
            <button
              onClick={() => handleApproval("approved")}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm"
            >
              Approve
            </button>

            <button
              onClick={() => handleApproval("rejected")}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm"
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ExpenseDetails;

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-700">{value || "-"}</p>
  </div>
);
