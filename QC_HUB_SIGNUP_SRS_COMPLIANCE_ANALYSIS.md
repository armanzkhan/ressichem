# QC Hub Signup - SRS Compliance Analysis

## 📋 Current Signup Page Roles

The signup page at `/qc/hub-signup` currently offers **5 permission-based roles**:

1. **QC Hub User** - Basic QC Hub access
2. **QC Analyst** - Access both portals, can submit data
3. **QC Manager** - Full access with approvals
4. **QC Admin** - Full access + user management
5. **QC Viewer** - Read-only access

---

## ❌ SRS Compliance Gap

### **Missing: Three-Layer Model Roles (SRS 2.3)**

According to the SRS Section 2.3, the **Three-Layer Role Model** is the **PRIMARY access control model**:

#### **Layer 1: QC (Execution & Compliance)**
- `QC_LAB_TECHNICIAN` - Execute QC testing, cannot see R&D data
- `QC_SUPERVISOR` - Supervise QC operations, can approve results

#### **Layer 2: R&D (Innovation & Development)**
- `R&D_CHEMIST` - Develop formulations, cannot release to QC
- `SENIOR_R&D_SCIENTIST` - Lead R&D projects, supervise experiments

#### **Layer 3: Management (Governance & Approval)**
- `TECHNICAL_MANAGER_RND` - Approve R&D→QC releases, freeze formulations, close CAPA
- `PLANT_HEAD` - Plant-level oversight, conduct MRM
- `CEO` / `DIRECTOR` - Full system access, strategic decisions

**Total Missing: 7 three-layer model roles**

---

## 🔍 Analysis

### Current Implementation:
- ✅ Permission-based roles are available (good for basic access)
- ❌ Three-layer model roles are NOT available during signup
- ❌ Users cannot select their layer (QC, R&D, or MANAGEMENT)
- ❌ Users cannot select their specific role within the layer

### SRS Requirement:
- The SRS 2.3 defines the three-layer model as the **primary access control mechanism**
- Each user should belong to ONE layer with a specific role
- The `qcRndProfile` field in the User model supports this, but it's not being set during signup

---

## ✅ Recommendation

### Option 1: Add Three-Layer Roles to Signup (Recommended)
- Add a two-step role selection:
  1. First select the **Layer** (QC, R&D, or MANAGEMENT)
  2. Then select the **Role** within that layer
- This makes the signup fully SRS-compliant

### Option 2: Admin Assignment Only
- Keep current permission-based roles for signup
- Have administrators assign three-layer roles after signup
- Less user-friendly but maintains control

### Option 3: Hybrid Approach (Best)
- Allow users to select both:
  - Permission-based role (for immediate access)
  - Three-layer role (for SRS compliance)
- Backend sets both during signup

---

## 🎯 Current Status

**SRS Compliance: ~40%**

- ✅ Permission-based roles: 100% compliant
- ❌ Three-layer model roles: 0% compliant (not available)
- ❌ Layer selection: 0% compliant (not available)
- ❌ Role within layer: 0% compliant (not available)

---

## 📝 Next Steps

To achieve **100% SRS compliance**, we need to:

1. Add three-layer model role selection to signup page
2. Update backend to set `qcRndProfile` during signup
3. Set appropriate access control flags based on selected role
4. Ensure middleware enforces three-layer access control

