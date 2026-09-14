const mongoose = require("mongoose");
const Permission = require("../../models/Permission");
const Role = require("../../models/Role");

const companyId = process.env.COMPANY_ID || "RESSICHEM";
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/Ressichem";

async function ensurePermission(key, description) {
  let permission = await Permission.findOne({ key, company_id: companyId });
  if (!permission) {
    permission = await Permission.create({
      key,
      description,
      company_id: companyId,
    });
    console.log(`Created permission: ${key}`);
  } else {
    console.log(`Permission already exists: ${key}`);
  }
  return permission;
}

async function setupLogisticsManagerRole() {
  await mongoose.connect(mongoUri);
  console.log(`Connected to MongoDB for company ${companyId}`);

  try {
    const ordersRead = await ensurePermission("orders.read", "View orders");
    const ordersHold = await ensurePermission("orders.hold", "Put order on hold");
    const ordersDispatch = await ensurePermission("orders.dispatch", "Dispatch order");

    const roleName = "Logistics Manager";
    let role = await Role.findOne({ name: roleName, company_id: companyId });

    if (!role) {
      role = await Role.create({
        name: roleName,
        description: "Can hold and dispatch orders only",
        company_id: companyId,
        permissions: [ordersRead._id, ordersHold._id, ordersDispatch._id],
      });
      console.log(`Created role: ${roleName}`);
    } else {
      role.permissions = [ordersRead._id, ordersHold._id, ordersDispatch._id];
      await role.save();
      console.log(`Updated role permissions: ${roleName}`);
    }

    console.log("Logistics manager setup completed.");
  } finally {
    await mongoose.disconnect();
  }
}

setupLogisticsManagerRole().catch((error) => {
  console.error("Failed to setup logistics manager role:", error);
  process.exit(1);
});
