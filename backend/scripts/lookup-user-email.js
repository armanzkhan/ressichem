require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");

const email = String(process.argv[2] || "zulfiqar@ressichem.com")
  .trim()
  .toLowerCase();

const URI =
  process.env.MONGODB_URI ||
  process.env.CONNECTION_STRING ||
  process.env.MONGO_URI ||
  "mongodb+srv://armanzaman4_db_user:1JJORz7jP2VFgTaP@cluster0.qn1babq.mongodb.net/Ressichem?retryWrites=true&w=majority";

(async () => {
  await mongoose.connect(URI, { dbName: "Ressichem" });
  const exact = await User.find({
    email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  })
    .select("email company_id isActive role user_id firstName lastName department")
    .lean();

  const fuzzy = await User.find({ email: /zulfiqar/i })
    .select("email company_id isActive role user_id firstName lastName")
    .lean();

  const companyUsers = await User.find({
    company_id: "RESSICHEM",
    email: /@ressichem\.com$/i,
    isActive: true,
  })
    .select("email isActive role")
    .sort({ email: 1 })
    .limit(30)
    .lean();

  console.log(
    JSON.stringify(
      {
        lookup: email,
        exactMatches: exact,
        fuzzyZulfiqar: fuzzy,
        sampleActiveRessichem: companyUsers,
      },
      null,
      2
    )
  );
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
