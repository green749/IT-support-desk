import { TicketCategory } from "../models/associations.js";

export async function listCategories(req, res) {
  try {
    const categories = await TicketCategory.findAll({
      where: { isActive: true },
      order: [["id", "ASC"]],
    });
    return res.json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load categories" });
  }
}
