import TicketCategory from "../models/TicketCategory.js";

export const INITIAL_CATEGORIES = [
  { key: "hardware", name: "Hardware Issue" },
  { key: "network", name: "Network Issue" },
  { key: "vpn", name: "VPN Issue" },
  { key: "software", name: "Software Issue" },
  { key: "email", name: "Email Issue" },
  { key: "account_access", name: "Account & Access Issue" },
  { key: "printer_scanning", name: "Printer & Scanning Issue" },
  { key: "security", name: "Security Issue" },
  { key: "new_employee_it", name: "New Employee IT Request" },
  { key: "other", name: "Other" },
];

export async function seedCategories() {
  try {
    for (const cat of INITIAL_CATEGORIES) {
      await TicketCategory.findOrCreate({
        where: { key: cat.key },
        defaults: {
          name: cat.name,
          isActive: true,
        },
      });
    }
    console.log("IT Support ticket categories seeded successfully");
  } catch (error) {
    console.error("Error seeding ticket categories:", error.message);
  }
}
