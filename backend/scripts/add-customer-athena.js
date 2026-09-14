const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const Customer = require("../models/Customer");
const User = require("../models/User");

const COMPANY_ID = "RESSICHEM";
const CUSTOMER_EMAIL = "Athenaconstruction@123";
const CUSTOMER_PASSWORD = "Athenaconstruction@123";

const CUSTOMER_DATA = {
  companyName: "(BCM) ATHENA CONSTRUCTION CHEMICALS",
  contactName: "ATHENA CONSTRUCTION CHEMICALS",
  email: CUSTOMER_EMAIL,
  phone: "0300-2337332",
  street: "Shop No,3, Commercial 4/1, Chapal Resort Block-1 Clifton, Karachi West Kemari Town",
  city: "Karachi",
  state: "SINDH",
  country: "Pakistan",
  status: "active",
  customerType: "regular",
  company_id: COMPANY_ID,
};

async function connectDB() {
  const uri = process.env.CONNECTION_STRING || "mongodb://localhost:27017/Ressichem";
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

async function run() {
  await connectDB();
  console.log("✅ Connected to MongoDB");

  let customer = await Customer.findOne({ email: CUSTOMER_EMAIL, company_id: COMPANY_ID });

  if (!customer) {
    customer = await Customer.create(CUSTOMER_DATA);
    console.log("✅ Customer created:", customer._id.toString());
  } else {
    Object.assign(customer, CUSTOMER_DATA);
    await customer.save();
    console.log("✅ Customer updated:", customer._id.toString());
  }

  const passwordHash = await bcrypt.hash(CUSTOMER_PASSWORD, 10);
  let user = await User.findOne({ email: CUSTOMER_EMAIL, company_id: COMPANY_ID });

  if (!user) {
    user = await User.create({
      user_id: `customer_${customer._id}`,
      company_id: COMPANY_ID,
      email: CUSTOMER_EMAIL,
      password: passwordHash,
      firstName: "ATHENA",
      lastName: "CONSTRUCTION",
      phone: CUSTOMER_DATA.phone,
      role: "Customer",
      department: "Customer",
      isCustomer: true,
      isActive: true,
      customerProfile: {
        customer_id: customer._id,
        companyName: CUSTOMER_DATA.companyName,
        customerType: CUSTOMER_DATA.customerType,
        preferences: customer.preferences,
      },
    });
    console.log("✅ User created:", user._id.toString());
  } else {
    user.password = passwordHash;
    user.isCustomer = true;
    user.isActive = true;
    user.role = "Customer";
    user.department = "Customer";
    user.customerProfile = {
      customer_id: customer._id,
      companyName: CUSTOMER_DATA.companyName,
      customerType: CUSTOMER_DATA.customerType,
      preferences: customer.preferences,
    };
    await user.save();
    console.log("✅ User updated:", user._id.toString());
  }

  customer.user_id = user._id;
  await customer.save();
  console.log("✅ Linked customer to user:", user._id.toString());

  await mongoose.disconnect();
  console.log("✅ Done");
}

run().catch(async (err) => {
  console.error("❌ Failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
