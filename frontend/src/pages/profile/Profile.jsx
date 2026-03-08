import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import useAuthStore from "../../app/authStore";
import { getUserById, updateUser } from "../../api/user.api";
import { getCompanyById } from "../../api/company.api";

const Profile = () => {
  const { user: authUser } = useAuthStore();

  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [password, setPassword] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        //Fetch user info
        const userRes = await getUserById(authUser._id);
        const fetchedUser = userRes.data.user;
        setUser(fetchedUser);

        //Fetch company info
        if (fetchedUser.company) {
          const companyRes = await getCompanyById(fetchedUser.company);
          setCompany(companyRes.data.company);
        }
      } catch (error) {
        toast.error("Failed to load profile information");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authUser._id]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (!password) {
      toast.error("Password is required");
      return;
    }

    try {
      setSaving(true);
      await updateUser(authUser._id, { password });
      toast.success("Password updated successfully");
      setPassword("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Password update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-semibold text-gray-800">Profile</h1>

      {/* USER INFO */}
      <Card title="User Information">
        <Info label="Name" value={user.name} />
        <Info label="Email" value={user.email} />
        <Info label="User Type" value={capitalize(user.userType)} />
        <Info label="Role" value={user.role?.title || "-"} />
        <Info
          label="Approval Limit"
          value={`₹${user.role?.approvalLimit ?? 0}`}
        />
      </Card>

      {/* COMPANY INFO */}
      {company && (
        <Card title="Company Information">
          <Info label="Company Name" value={company.name} />
          <Info label="Company ID" value={company._id} />
          <Info
            label="Status"
            value={company.isActive ? "Active" : "Inactive"}
          />
        </Card>
      )}

      {/* PASSWORD CHANGE */}
      <Card title="Change Password">
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </Card>     
    </div>
  );
};

export default Profile;

const Card = ({ title, children }) => (
  <div className="bg-white border rounded-xl p-6 space-y-4">
    <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-800">{value || "-"}</p>
  </div>
);

const Input = ({ label, ...props }) => (
  <div className="flex flex-col">
    <label className="text-sm text-gray-600 mb-1">{label}</label>
    <input
      {...props}
      className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
    />
  </div>
);

const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : "";