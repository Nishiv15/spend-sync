import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  createExpense,
  getExpenseById,
  updateExpense,
} from "../../api/expense.api";

const CreateExpense = () => {
  const navigate = useNavigate();

  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    department: "",
    items: [{ description: "", qty: 1, unitPrice: 0 }],
    attachments: [""],
  });

  useEffect(() => {
    if (!isEditMode) return;

    const fetchExpense = async () => {
      try {
        setPageLoading(true);
        const res = await getExpenseById(id);
        const expense = res.data.expense;

        if (expense.status !== "draft") {
          toast.error("Only draft expenses can be edited");
          navigate("/app/expenses");
          return;
        }

        setForm({
          title: expense.title,
          department: expense.department,
          items:
            expense.items?.length > 0
              ? expense.items.map((item) => ({
                  description: item.description || "",
                  qty: item.qty ?? item.quantity ?? 1,
                  unitPrice: item.unitPrice ?? 0,
                }))
              : [{ description: "", qty: 1, unitPrice: 0 }],
          attachments:
            expense.attachments?.length > 0 ? expense.attachments : [""],
        });
      } catch {
        toast.error("Unable to load expense");
        navigate("/app/expenses");
      } finally {
        setPageLoading(false);
      }
    };

    fetchExpense();
  }, [id, isEditMode, navigate]);


  const calculateTotalAmount = () =>
    form.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...form.items];
    updatedItems[index][field] = value;
    setForm({ ...form, items: updatedItems });
  };

  const handleAttachmentChange = (index, value) => {
    const updated = [...form.attachments];
    updated[index] = value;
    setForm({ ...form, attachments: updated });
  };

  const addAttachment = () =>
    setForm({ ...form, attachments: [...form.attachments, ""] });

  const removeAttachment = (index) => {
    if (form.attachments.length === 1) return;
    setForm({
      ...form,
      attachments: form.attachments.filter((_, i) => i !== index),
    });
  };

  const addItem = () =>
    setForm({
      ...form,
      items: [...form.items, { description: "", qty: 1, unitPrice: 0 }],
    });

  const removeItem = (index) => {
    if (form.items.length === 1) return;
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    const totalAmount = calculateTotalAmount();

    if (!form.title || !form.department) {
      toast.error("Title and department are required");
      return;
    }

    if (!form.items[0].description) {
      toast.error("Item description is required");
      return;
    }

    if (totalAmount <= 0) {
      toast.error("Total amount must be greater than 0");
      return;
    }

    const cleanedAttachments = form.attachments.filter(
      (link) => link.trim() !== "",
    );

    const payload = {
      title: form.title,
      department: form.department,
      items: form.items,
      totalAmount,
      attachments: cleanedAttachments,
      status: "draft",
    };

    try {
      setLoading(true);

      if (isEditMode) {
        await updateExpense(id, payload);
        toast.success("Expense updated");
        navigate(`/app/expenses/${id}`);
      } else {
        await createExpense(payload);
        toast.success("Expense saved as draft");
        navigate("/app/expenses");
      }
    } catch {
      toast.error(isEditMode ? "Update failed" : "Create failed");
    } finally {
      setLoading(false);
    }
  };


  if (pageLoading) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        {isEditMode ? "Edit Expense" : "Create Expense"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-xl p-6 space-y-6"
      >
        {/* BASIC INFO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Title *"
            name="title"
            placeholder="Expense Title"
            value={form.title}
            onChange={handleChange}
          />

          <Input
            label="Department *"
            name="department"
            placeholder="HR/ IT/ Finance"
            value={form.department}
            onChange={handleChange}
          />
        </div>

        {/* ITEMS */}
        <div>
          <h2 className="font-medium text-gray-700 mb-3">Expense Items *</h2>

          {form.items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3"
            >
              <Input
                label="Description *"
                value={item.description}
                onChange={(e) =>
                  handleItemChange(index, "description", e.target.value)
                }
              />

              <Input
                label="Quantity"
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) =>
                  handleItemChange(index, "qty", Number(e.target.value))
                }
              />

              <Input
                label="Unit Price"
                type="number"
                min={0}
                value={item.unitPrice}
                onChange={(e) =>
                  handleItemChange(index, "unitPrice", Number(e.target.value))
                }
              />

              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-sm text-red-500 mt-6"
              >
                Remove
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addItem}
            className="text-sm text-indigo-600 hover:underline"
          >
            + Add Item
          </button>
        </div>

        {/* ATTACHMENTS */}
        <div>
          <h2 className="font-medium text-gray-700 mb-2">
            Attachments (Links)
          </h2>

          {form.attachments.map((link, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={link}
                onChange={(e) => handleAttachmentChange(index, e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="text-red-500 text-sm"
              >
                Remove
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addAttachment}
            className="text-sm text-indigo-600 hover:underline"
          >
            + Add another link
          </button>
        </div>

        {/* TOTAL */}
        <div className="text-right text-sm font-medium text-gray-700">
          Total Amount: ₹{calculateTotalAmount()}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-60"
          >
            {loading
              ? "Saving..."
              : isEditMode
                ? "Save Changes"
                : "Save (Draft)"}
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(isEditMode ? `/app/expenses/${id}` : "/app/expenses")
            }
            className="px-6 py-2 rounded-lg border text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateExpense;

const Input = ({ label, ...props }) => (
  <div className="flex flex-col">
    <label className="text-sm text-gray-600 mb-1">{label}</label>
    <input
      {...props}
      className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
    />
  </div>
);