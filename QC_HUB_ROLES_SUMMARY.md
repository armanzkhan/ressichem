# QC Hub User Roles - Complete Summary

## 📊 Total Roles Available for QC Hub Users

### **Permission-Based Roles (6 roles):**

1. **QC Hub User** (Default)
   - Access: QC Hub only (plan, forms, exports)
   - Permissions: Read/create/update/submit QC Hub forms and plan
   - Cannot: Approve, access QC Site Area

2. **QC Analyst**
   - Access: Both QC Site Area AND QC Hub
   - Permissions: Read/create/update/submit (both portals)
   - Cannot: Approve results or forms

3. **QC Manager**
   - Access: Full access to both portals
   - Permissions: ALL QC permissions including approvals
   - Can: Approve results, approve forms, manage QC users

4. **QC Admin**
   - Access: Full QC access + user management
   - Permissions: All QC permissions + create/update QC users
   - Can: Manage QC module, create QC users, configure settings

5. **QC Viewer**
   - Access: Read-only access to both portals
   - Permissions: Read and export only
   - Cannot: Create, edit, or approve anything

6. **QC Site User**
   - Access: QC Site Area only (not for QC Hub signup, but exists in system)
   - Note: This role is for QC Site portal, not QC Hub

---

### **Three-Layer Model Roles (7 roles):**

These roles are part of the SRS 2.3 three-layer model and can be combined with permission-based roles:

#### Layer 1: QC (Execution & Compliance)
1. **QC_LAB_TECHNICIAN**
   - Execute QC testing
   - Cannot see R&D data
   - Cannot approve results

2. **QC_SUPERVISOR**
   - Supervise QC operations
   - Can approve/reject QC results
   - Cannot see R&D data

#### Layer 2: R&D (Innovation & Development)
3. **R&D_CHEMIST**
   - Develop formulations
   - Cannot release to QC

4. **SENIOR_R&D_SCIENTIST**
   - Lead R&D projects
   - Supervise experiments

#### Layer 3: Management (Governance & Approval)
5. **TECHNICAL_MANAGER_RND**
   - Approve R&D→QC releases
   - Freeze formulations
   - Close CAPA

6. **PLANT_HEAD**
   - Plant-level oversight
   - Conduct MRM

7. **CEO / DIRECTOR**
   - Full system access
   - Strategic decisions

---

## 🎯 Recommended Roles for QC Hub Signup

For **QC Hub signup page**, the most relevant roles are:

1. **QC Hub User** - Basic QC Hub access (default)
2. **QC Analyst** - Access to both portals, can submit data
3. **QC Manager** - Full access with approvals
4. **QC Admin** - Full access + user management
5. **QC Viewer** - Read-only access

**Note:** Three-layer model roles are typically assigned by administrators after signup, as they require specific access control flags and are more complex.

---

## 📝 Current Issue

The signup page at `/qc/hub-signup` currently:
- ❌ Does NOT have a role selection dropdown
- ❌ Automatically assigns "QC Hub User" role
- ❌ Does not allow users to choose their role

**Solution:** Add role selection dropdown to signup form.

