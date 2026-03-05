import { useEffect, useState } from "react";
import { Receipt, Clock, CheckCircle, XCircle, Users } from "lucide-react";

import useAuthStore from "../../app/authStore";
import StatCard from "../../components/common/StatCard";
import { getExpenses } from "../../api/expense.api";

const Dashboard = () => {
  const { user } = useAuthStore();
  const isManager = user?.userType === "manager";

  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    approved: 0,
    rejected: 0,
    submitted: 0,
  });

  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [
          totalRes,
          draftRes,
          approvedRes,
          rejectedRes,
          submittedRes,
          recentRes,
        ] = await Promise.all([
          getExpenses({ status: "all", limit: 1 }),
          getExpenses({ status: "draft", limit: 1 }),
          getExpenses({ status: "approved", limit: 1 }),
          getExpenses({ status: "rejected", limit: 1 }),
          getExpenses({ status: "submitted", limit: 1 }),
          getExpenses({ status: "all", limit: 5 }),
        ]);

        setStats({
          total: totalRes.data.totalItems || 0,
          draft: draftRes.data.totalItems || 0,
          approved: approvedRes.data.totalItems || 0,
          rejected: rejectedRes.data.totalItems || 0,
          submitted: submittedRes.data.totalItems || 0,
        });

        setRecentExpenses(recentRes.data.expenses || []);
        
      } catch (error) {
        console.error("Dashboard data error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-gray-800">
          Welcome, {user?.name}
        </h1>
        <p className="text-gray-500 text-sm">
          Expense overview for your account
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Expenses"
          value={loading ? "—" : stats.total}
          icon={Receipt}
          color="indigo"
        />

        <StatCard
          title="Drafts"
          value={loading ? "—" : stats.draft}
          icon={Clock}
          color="yellow"
        />

        <StatCard
          title="Approved"
          value={loading ? "—" : stats.approved}
          icon={CheckCircle}
          color="green"
        />

        <StatCard
          title="Rejected"
          value={loading ? "—" : stats.rejected}
          icon={XCircle}
          color="red"
        />

        {isManager && (
          <StatCard
            title="Pending Approvals"
            value={loading ? "—" : stats.submitted}
            icon={Users}
            color="purple"
          />
        )}
      </div>

      {/* Recent Expenses */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-700">Recent Expenses</h2>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            Loading recent expenses...
          </div>
        ) : recentExpenses.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">No expenses found</div>
        ) : (
          <div className="divide-y">
            {recentExpenses.map((expense) => (
              <div
                key={expense._id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-800 text-base">{expense.title}</p>
                  <p className="text-gray-500 mt-1">
                    ₹{expense.totalAmount} • {new Date(expense.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize w-max ${
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;