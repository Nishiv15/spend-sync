import bcrypt from "bcrypt";
import Company from "../models/Company.js";
import Role from "../models/Role.js";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

const registerUser = async (req, res) => {
  try {
    const companyId = req.user.company;

    const {
      name,
      email,
      password,
      role,
      amountLimit,
      userType = "employee",
    } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "name, email, password and role are required",
      });
    }

    // Company existence check
    const company = await Company.findById(companyId).lean();
    if (!company) {
      return res.status(400).json({ message: "Invalid company" });
    }

    // Check email uniqueness within same company
    const existingUser = await User.findOne({ company: companyId, email });
    if (existingUser) {
      return res.status(409).json({
        message: "Email already exists for this company",
      });
    }

    // Find or Create the Role
    let roleDoc = await Role.findOne({
      company: companyId,
      title: role,
    });

    if (!roleDoc) {
      roleDoc = await Role.create({
        company: companyId,
        title: role,
        approvalLimit: amountLimit,
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create User
    const user = await User.create({
      company: companyId,
      name,
      email,
      passwordHash,
      role: roleDoc._id,
      userType,
      isActive: true,
    });

    // Return user without password
    const sanitizedUser = await User.findById(user._id)
      .select("-passwordHash")
      .populate("role")
      .lean();

    return res.status(201).json({
      message: "User registered successfully",
      user: sanitizedUser,
    });
  } catch (error) {
    console.error("registerEmployee error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email, isActive: true })
      .populate("role")
      .lean();

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Get company directly from user's company ID
    const company = await Company.findById(user.company).lean();
    if (!company) {
      return res
        .status(500)
        .json({ message: "Company not found for this user" });
    }

    // Generate JWT token
    const token = generateToken({
      _id: user._id,
      userType: user.userType,
      company: user.company,
    });

    // Remove passwordHash before sending
    delete user.passwordHash;

    return res.json({
      message: "Login successful",
      token,
      user,
      company,
    });
  } catch (error) {
    console.error("companyLogin error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const requester = req.user; 
    const companyId = requester.company;
    const targetUserId = req.params.id;
    const { password, role, roleTitleNew, approvalLimit, userType } = req.body;

    if (!companyId)
      return res
        .status(400)
        .json({ message: "Requester not associated with a company" });

    // Find target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Ensure target user belongs to the same company
    if (
      !targetUser.company ||
      targetUser.company.toString() !== companyId.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Cannot modify users outside your company" });
    }

    const isSelf =
      requester.id === targetUserId ||
      requester._id?.toString() === targetUserId;
    const isManagerOrAdmin = ["manager", "admin"].includes(requester.userType);

    // If requester is not manager/admin and not self -> forbidden
    if (!isSelf && !isManagerOrAdmin) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient privileges" });
    }

    // If requester is self only, they can only change password
    if (isSelf && !isManagerOrAdmin) {
      if (!password) {
        return res
          .status(400)
          .json({
            message: "Only password can be updated by the user themself",
          });
      }
      // Hash the password and update
      const salt = await bcrypt.genSalt(10);
      targetUser.passwordHash = await bcrypt.hash(password, salt);
      await targetUser.save();

      const sanitized = await User.findById(targetUser._id)
        .select("-passwordHash")
        .populate("role")
        .lean();
      return res.json({ message: "Password updated", user: sanitized });
    }

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      targetUser.passwordHash = await bcrypt.hash(password, salt);
    }

    // Update role if provided
    if (role) {
      let roleDoc = null;

      // Find role by id
      if (typeof role === "string" && role.match(/^[0-9a-fA-F]{24}$/)) {
        roleDoc = await Role.findOne({ _id: role, company: companyId });
        if (!roleDoc) {
          return res
            .status(400)
            .json({ message: "Role ID not found in this company" });
        }
      } else if (typeof role === "string") {
        // Find by existing title
        const normalizedTitle = role.trim();
        roleDoc = await Role.findOne({
          company: companyId,
          title: { $regex: `^${normalizedTitle}$`, $options: "i" }, //regesx is used. It can be avoided by keeping the role name same to that as in DB
        });
        if (!roleDoc) {
          return res.status(400).json({
            message: `Role "${normalizedTitle}" does not exist in this company. Please create the role first.`,
          });
        }
      } else {
        return res.status(400).json({ message: "Invalid role format" });
      }

      // update the role document's title
      if (roleTitleNew && typeof roleTitleNew === "string") {
        const newTitle = roleTitleNew.trim();
        if (!newTitle) {
          return res
            .status(400)
            .json({ message: "roleTitleNew cannot be empty" });
        }
        roleDoc.title = newTitle;
      }

      // update approvalLimit on the role
      if (approvalLimit !== undefined && approvalLimit !== null) {
        const parsed = Number(approvalLimit);
        if (Number.isNaN(parsed) || parsed < 0) {
          return res
            .status(400)
            .json({ message: "approvalLimit must be a non-negative number" });
        }
        roleDoc.approvalLimit = parsed;
      }

      await roleDoc.save();

      // Assign role to the user
      targetUser.role = roleDoc._id;
    } else if (approvalLimit !== undefined && approvalLimit !== null) {
      const roleToUpdateId = targetUser.role;
      if (!roleToUpdateId) {
        return res
          .status(400)
          .json({
            message: "Cannot update approvalLimit: user has no role assigned",
          });
      }
      const roleToUpdate = await Role.findOne({
        _id: roleToUpdateId,
        company: companyId,
      });
      if (!roleToUpdate) {
        return res
          .status(400)
          .json({ message: "Role to update not found in this company" });
      }
      const parsed = Number(approvalLimit);
      if (Number.isNaN(parsed) || parsed < 0) {
        return res
          .status(400)
          .json({ message: "approvalLimit must be a non-negative number" });
      }
      roleToUpdate.approvalLimit = parsed;
      await roleToUpdate.save();
    }

    // Update userType if provided
    if (userType) {
      if (!["employee", "manager", "admin"].includes(userType)) {
        return res
          .status(400)
          .json({
            message: "Invalid userType. Allowed: employee, manager, admin",
          });
      }
      targetUser.userType = userType;
    }

    // Save the user
    await targetUser.save();

    // Return sanitized updated user
    const sanitizedUser = await User.findById(targetUser._id)
      .select("-passwordHash")
      .populate("role")
      .lean();

    return res.json({
      message: "User updated successfully",
      user: sanitizedUser,
    });
  } catch (error) {
    console.error("updateEmployee error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const requester = req.user; 
    const companyId = requester.company;
    const targetUserId = req.params.id;
    const { confirm } = req.body;

    if (!companyId) {
      return res
        .status(400)
        .json({ message: "Requester not associated with a company" });
    }

    // Only manager can delete users
    if (requester.userType !== "manager") {
      return res
        .status(403)
        .json({ message: "Forbidden: only managers can delete users" });
    }

    // Require explicit confirm text
    if (!confirm || confirm !== "Confirm") {
      return res.status(400).json({
        message:
          'Deletion requires confirmation. Set body { "confirm": "Confirm" } to proceed.',
      });
    }

    // Find target user
    const targetUser = await User.findById(targetUserId)
      .populate("role")
      .exec();
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Ensure target user belongs to same company
    if (
      !targetUser.company ||
      targetUser.company.toString() !== companyId.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Cannot delete users outside your company" });
    }

    if (targetUser.userType === "manager") {
      const otherManagersCount = await User.countDocuments({
        company: companyId,
        userType: "manager",
        _id: { $ne: targetUser._id },
        isActive: true,
      });

      if (otherManagersCount === 0) {
        return res.status(400).json({
          message:
            "Cannot delete this manager because they are the last active manager for the company.",
        });
      }
    }

    targetUser.isActive = false;
    await targetUser.save();

    // Capture role id before deleting user
    const roleId = targetUser.role ? targetUser.role._id : null;

    let roleDeleted = false;
    if (roleId) {
      const activeRefs = await User.countDocuments({
        company: companyId,
        role: roleId,
        isActive: true, 
      });

      if (activeRefs === 0) {
        const roleDeleteResult = await Role.deleteOne({
          _id: roleId,
          company: companyId,
        });

        if (roleDeleteResult.deletedCount === 1) {
          roleDeleted = true;
        }
      }
    }

    return res.json({
      message: "User deactivated successfully",
      userId: targetUserId,
      roleDeleted,
    });
  } catch (error) {
    console.error("deleteUser error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getUsers = async (req, res) => {
  try {
    const requester = req.user;
    
    // Manager-only
    if (requester.userType !== "manager") {
      return res.status(403).json({
        message: "Only managers can view users"
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    // applying filter for removing non-active users
    const filter = {
      company: requester.company,
      isActive: true
    };

    // run count and find in parallel for correctness and performance
    const [totalUsers, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean()
    ]);

    const totalPages = Math.max(1, Math.ceil(totalUsers / limit));
    const currentPage = Math.min(page, totalPages);

    // if requested page > totalPages, refetch the last page users
    let pagedUsers = users;
    if (page > totalPages && totalUsers > 0) {
      const newSkip = (totalPages - 1) * limit;
      pagedUsers = await User.find(filter).skip(newSkip).limit(limit).sort({ createdAt: -1 }).lean();
    }

    return res.json({
      users: pagedUsers,
      totalUsers,
      totalPages,
      currentPage,
      limit
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

const getUserById = async (req, res) => {
  try {
    const requester = req.user;
    const targetUserId = req.params.id;

    const user = await User.findById(targetUserId)
      .select("-passwordHash")
      .populate("role")
      .lean();

    if (!user || !user.isActive) {
      return res.status(404).json({ message: "User not found" });
    }

    // Company check
    if (user.company.toString() !== requester.company.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Employee can only view self
    if (
      requester.userType !== "manager" &&
      requester._id.toString() !== targetUserId
    ) {
      return res.status(403).json({
        message: "You can only view your own profile",
      });
    }

    return res.json({ user });
  } catch (error) {
    console.error("getUserById error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export {
  userLogin,
  registerUser,
  updateUser,
  deleteUser,
  getUsers,
  getUserById,
};
