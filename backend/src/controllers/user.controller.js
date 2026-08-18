import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { User, TicketCategory, AgentCategory } from "../models/associations.js";
import TicketActivity from "../models/TicketActivity.js";

const publicFields = ["id", "name", "email", "role", "isActive", "createdAt", "updatedAt"];

export async function listUsers(req, res) {
  try {
    const where = {};
    if (req.query.role) where.role = req.query.role;
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } },
      ];
    }
    const users = await User.findAll({
      where,
      attributes: publicFields,
      include: [
        {
          model: TicketCategory,
          as: "supportCategories",
          attributes: ["id", "key", "name", "isActive"],
          through: { attributes: [] },
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    return res.json({ success: true, data: users });
  } catch (error) {
    console.error("List users error:", error);
    return res.status(500).json({ success: false, message: "Unable to load users" });
  }
}

export async function getUser(req, res) {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: publicFields,
      include: [
        {
          model: TicketCategory,
          as: "supportCategories",
          attributes: ["id", "key", "name", "isActive"],
          through: { attributes: [] },
          required: false,
        },
      ],
    });
    return user
      ? res.json({ success: true, data: user })
      : res.status(404).json({ success: false, message: "User not found" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load user" });
  }
}

export async function getAgentCategories(req, res) {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ["id", "name", "role"],
      include: [
        {
          model: TicketCategory,
          as: "supportCategories",
          attributes: ["id", "key", "name", "isActive"],
          through: { attributes: [] },
        },
      ],
    });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json({
      success: true,
      data: {
        userId: user.id,
        role: user.role,
        categories: user.supportCategories || [],
        categoryIds: (user.supportCategories || []).map((c) => c.id),
      },
    });
  } catch (error) {
    console.error("Get agent categories error:", error);
    return res.status(500).json({ success: false, message: "Unable to load agent categories" });
  }
}

export async function updateUser(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.params.id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updates = {};
    const oldRole = user.role;

    // Check if role is provided and validate it
    if (req.body.role !== undefined) {
      if (!["customer", "agent", "admin"].includes(req.body.role)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Invalid role value" });
      }

      // A user must NOT be able to change their own role
      if (Number(req.params.id) === Number(req.user.id)) {
        if (req.body.role !== user.role) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: "You cannot change your own role" });
        }
      }

      updates.role = req.body.role;
    }

    // Check if isActive is provided and validate it
    if (req.body.isActive !== undefined) {
      if (typeof req.body.isActive !== "boolean") {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "isActive must be a boolean" });
      }
      updates.isActive = req.body.isActive;
    }

    const targetRole = updates.role !== undefined ? updates.role : user.role;

    // Prevent deactivating or demoting the last active administrator
    if (user.role === "admin" && (updates.isActive === false || (updates.role && updates.role !== "admin"))) {
      const activeAdminCount = await User.count({
        where: {
          role: "admin",
          isActive: true,
        },
        transaction,
      });
      if (activeAdminCount <= 1 && user.isActive) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Cannot deactivate or demote the last active administrator.",
        });
      }
    }

    // Apply basic user field updates
    if (Object.keys(updates).length > 0) {
      await user.update(updates, { transaction });
    }

    // Handle Agent Category Mappings
    if (targetRole === "agent") {
      // If categoryIds are provided, validate and update them
      if (req.body.categoryIds !== undefined && Array.isArray(req.body.categoryIds)) {
        const categoryIds = req.body.categoryIds.map(Number).filter(Boolean);

        if (categoryIds.length > 0) {
          const validCategories = await TicketCategory.findAll({
            where: {
              id: { [Op.in]: categoryIds },
              isActive: true,
            },
            transaction,
          });

          if (validCategories.length !== categoryIds.length) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: "One or more selected categories are invalid or inactive",
            });
          }
        }

        // Atomically replace existing mappings
        await AgentCategory.destroy({
          where: { agentId: user.id },
          transaction,
        });

        if (categoryIds.length > 0) {
          const mappings = categoryIds.map((catId) => ({
            agentId: user.id,
            categoryId: catId,
          }));
          await AgentCategory.bulkCreate(mappings, { transaction });
        }
      }
    } else {
      // Role is NOT agent (e.g. Employee or Admin) -> Remove all agent category mappings
      await AgentCategory.destroy({
        where: { agentId: user.id },
        transaction,
      });
    }

    await transaction.commit();

    // Log role change to MongoDB if role changed
    if (updates.role && updates.role !== oldRole) {
      await TicketActivity.create({
        ticketId: 0,
        userId: req.user.id,
        action: "role_change",
        details: { targetUserId: user.id, oldRole: oldRole, newRole: updates.role },
      });
    }

    // Reload user with updated categories
    const refreshedUser = await User.findByPk(user.id, {
      attributes: publicFields,
      include: [
        {
          model: TicketCategory,
          as: "supportCategories",
          attributes: ["id", "key", "name", "isActive"],
          through: { attributes: [] },
        },
      ],
    });

    return res.json({ success: true, data: refreshedUser });
  } catch (error) {
    await transaction.rollback();
    console.error("Update user error:", error);
    return res.status(500).json({ success: false, message: "Unable to update user" });
  }
}
