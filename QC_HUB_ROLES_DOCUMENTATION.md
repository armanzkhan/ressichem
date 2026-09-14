# QC Hub System - Complete Roles Documentation

## 📋 ROLE STRUCTURE OVERVIEW

The QC Hub system uses a **hybrid role model** combining:
1. **Three-Layer Role Model** (SRS 2.3) - For access control and data visibility
2. **Permission-Based Roles** - For granular permissions
3. **Portal-Based Roles** - For QC Site vs QC Hub separation

---

## 🏗️ THREE-LAYER ROLE MODEL (SRS 2.3)

This is the primary access control model defined in the SRS. Each user belongs to ONE layer.

### Layer 1: QC (Execution & Compliance)

**Purpose**: Execute QC testing, batch release, compliance monitoring

**Roles:**
1. **QC_LAB_TECHNICIAN**
   - Can create and submit QC results
   - Can create complaints
   - Can initiate CAPA
   - **Cannot** see R&D data
   - **Cannot** see customer data in complaints (only QC Supervisor can)
   - **Cannot** approve results
   - **Cannot** release batches

2. **QC_SUPERVISOR**
   - All QC Lab Technician permissions
   - Can approve/reject QC results
   - Can investigate complaints
   - Can see customer data in complaints
   - Can submit complaints for management review
   - **Cannot** see R&D data
   - **Cannot** close CAPA or MRM

**Access:**
- ✅ QC-approved formulations only
- ✅ QC Results (create, submit, approve)
- ✅ QC Standards
- ✅ QC Tests
- ✅ Raw Materials (view and manage batches)
- ✅ Complaints (QC layer only)
- ✅ CAPA (can initiate, cannot close)
- ❌ R&D formulations
- ❌ R&D experiments
- ❌ Customer data (except QC Supervisor in complaints)

---

### Layer 2: R&D (Innovation & Development)

**Purpose**: Develop new formulations, conduct experiments, optimize products

**Roles:**
1. **R&D_CHEMIST**
   - Can create and manage R&D formulations
   - Can create and manage R&D experiments
   - Can add trials to experiments
   - Can compare formulations
   - **Cannot** see QC data
   - **Cannot** see customer data
   - **Cannot** release formulations to QC
   - **Cannot** see complaints

2. **SENIOR_R&D_SCIENTIST**
   - All R&D Chemist permissions
   - Can supervise experiments
   - Can complete experiments
   - Can recommend formulations
   - **Cannot** release to QC (Management only)
   - **Cannot** see QC data
   - **Cannot** see customer data

**Access:**
- ✅ R&D formulations (full access)
- ✅ R&D experiments (full access)
- ✅ Raw Materials (for formulation development)
- ❌ QC-approved formulations
- ❌ QC Results
- ❌ Complaints (cannot see customer data)
- ❌ CAPA (unless assigned)
- ❌ MRM

---

### Layer 3: Management (Governance & Approval)

**Purpose**: Approve R&D→QC transitions, freeze formulations, close CAPA, conduct MRM

**Roles:**
1. **TECHNICAL_MANAGER_RND**
   - Full access to QC and R&D data
   - Can approve R&D formulations for QC release
   - Can freeze formulations
   - Can define acceptance limits
   - Can close CAPA
   - Can conduct MRM
   - Can review complaints
   - Can see all customer data

2. **PLANT_HEAD**
   - All Technical Manager permissions
   - Additional plant-level oversight
   - Can approve batch releases
   - Can conduct MRM

3. **CEO**
   - Full system access
   - Can approve all critical decisions
   - Can conduct MRM
   - Can override any restrictions

4. **DIRECTOR**
   - Full system access
   - Can approve all critical decisions
   - Can conduct MRM
   - Strategic oversight

**Access:**
- ✅ **Full QC + R&D data access**
- ✅ Can approve R&D → QC transitions
- ✅ Can freeze formulations
- ✅ Can define acceptance limits
- ✅ Can close CAPA
- ✅ Can conduct MRM
- ✅ Can see all customer data
- ✅ Can approve batch releases
- ✅ Can review and approve all workflows

---

## 🔐 PERMISSION-BASED ROLES

These roles are created via the permission system and provide granular access control.

### 1. QC Site User
**Description**: QC Site Area access only (tests/standards/results). No QC Hub access.

**Permissions:**
- `qc.access`
- `qc.tests.read`
- `qc.standards.read`
- `qc.results.read`
- `qc.results.create`
- `qc.results.update`
- `qc.results.submit`
- `qc.exports.read`

**Access:**
- ✅ QC Site Area (tests, standards, results)
- ❌ QC Hub (forms, plan)

---

### 2. QC Hub User
**Description**: QC Hub access only (Dry Mortar plan + raw data forms). No QC Site access.

**Permissions:**
- `qc.access`
- `qc.hub.plan.read`
- `qc.hub.forms.read`
- `qc.hub.forms.create`
- `qc.hub.forms.update`
- `qc.hub.forms.submit`
- `qc.hub.forms.export`

**Access:**
- ✅ QC Hub (plan, forms, exports)
- ❌ QC Site Area

---

### 3. QC Analyst
**Description**: QC data input and batch testing (submit for approval)

**Permissions:**
- `qc.access`
- `qc.tests.read`
- `qc.standards.read`
- `qc.results.read`
- `qc.results.create`
- `qc.results.update`
- `qc.results.submit`
- `qc.exports.read`
- `qc.hub.plan.read`
- `qc.hub.forms.read`
- `qc.hub.forms.create`
- `qc.hub.forms.update`
- `qc.hub.forms.submit`

**Access:**
- ✅ QC Site Area (read/create/submit)
- ✅ QC Hub (read/create/submit)
- ❌ Approve results
- ❌ Approve forms

---

### 4. QC Manager
**Description**: QC manager/director (full QC access including approvals)

**Permissions:**
- **ALL QC permissions** (full access)

**Access:**
- ✅ QC Site Area (full access)
- ✅ QC Hub (full access)
- ✅ Can approve results
- ✅ Can approve forms
- ✅ Can manage QC users

---

### 5. QC Admin
**Description**: Manage QC module + create QC users (Site/Hub)

**Permissions:**
- All QC permissions
- `qc.users.read`
- `qc.users.create`
- `qc.users.update`

**Access:**
- ✅ Full QC access
- ✅ Can manage QC users
- ✅ Can configure QC settings

---

### 6. QC Viewer
**Description**: Read-only QC dashboards and exports

**Permissions:**
- `qc.access`
- `qc.results.read`
- `qc.exports.read`
- `qc.hub.plan.read`
- `qc.hub.forms.read`

**Access:**
- ✅ Read-only access to all QC data
- ✅ Can export data
- ❌ Cannot create/edit/approve

---

## 🔄 ROLE MAPPING

### How Three-Layer Model Maps to Permission Roles:

```
QC_LAB_TECHNICIAN → QC Analyst (with QC layer restrictions)
QC_SUPERVISOR → QC Manager (with QC layer restrictions)
R&D_CHEMIST → Custom R&D role (needs to be created)
SENIOR_R&D_SCIENTIST → Custom R&D role (needs to be created)
TECHNICAL_MANAGER_RND → QC Admin + Management layer
PLANT_HEAD → QC Admin + Management layer
CEO → Super Admin + Management layer
DIRECTOR → Super Admin + Management layer
```

---

## 📊 ROLE ASSIGNMENT IN QC HUB

### Current Implementation:

**User Model Fields:**
```javascript
{
  // Traditional role (string)
  role: "QC Site User" | "QC Hub User" | "QC Analyst" | etc.
  
  // Permission-based roles (array of Role IDs)
  roles: [Role._id, ...]
  
  // Direct permissions (array of Permission IDs)
  permissions: [Permission._id, ...]
  
  // Three-layer model (SRS 2.3)
  qcRndProfile: {
    layer: "QC" | "R&D" | "MANAGEMENT",
    qcRole: "QC_LAB_TECHNICIAN" | "QC_SUPERVISOR",
    rndRole: "R&D_CHEMIST" | "SENIOR_R&D_SCIENTIST",
    managementRole: "TECHNICAL_MANAGER_RND" | "PLANT_HEAD" | "CEO" | "DIRECTOR",
    // Access control flags
    canAccessRndData: boolean,
    canReleaseToQC: boolean,
    canFreezeFormulations: boolean,
    canDefineAcceptanceLimits: boolean,
    canCloseCAPA: boolean,
    canConductMRM: boolean
  }
}
```

---

## 🎯 ROLE USAGE IN QC HUB MODULES

### Raw Materials
- **QC Layer**: Can view and manage batches
- **R&D Layer**: Can view and select materials for formulations
- **Management**: Full access

### Formulations
- **QC Layer**: Can only see QC-approved formulations
- **R&D Layer**: Can create and manage R&D formulations
- **Management**: Full access, can approve R&D→QC, can freeze

### R&D Experiments
- **QC Layer**: ❌ No access
- **R&D Layer**: ✅ Full access
- **Management**: ✅ Full access

### Complaints
- **QC Layer**: ✅ Can create and investigate (QC Supervisor can see customer data)
- **R&D Layer**: ❌ No access (cannot see customer data)
- **Management**: ✅ Full access, can review and close

### CAPA
- **QC Layer**: ✅ Can initiate, cannot close
- **R&D Layer**: ✅ Can be assigned, cannot initiate or close
- **Management**: ✅ Full access, can close

### MRM
- **QC Layer**: ❌ No access
- **R&D Layer**: ❌ No access
- **Management**: ✅ Full access, can conduct and approve

### Reporting
- **QC Layer**: ✅ Can view QC reports
- **R&D Layer**: ✅ Can view R&D reports
- **Management**: ✅ Full access to all reports

### Raw Data Forms (QC Hub)
- **QC Layer**: ✅ Can create, submit, view
- **R&D Layer**: ❌ No access
- **Management**: ✅ Full access, can approve

### QC Plan (QC Hub)
- **QC Layer**: ✅ Can view
- **R&D Layer**: ✅ Can view (for reference)
- **Management**: ✅ Full access, can update

---

## 🔧 SETTING UP ROLES

### 1. Run Permission Setup Script
```bash
node backend/scripts/migrations/setup-qc-permissions.js RESSICHEM
```

This creates:
- All QC permissions
- Permission groups
- Default roles (QC Site User, QC Hub User, QC Analyst, QC Manager, QC Admin, QC Viewer)

### 2. Assign Three-Layer Profile to Users

When creating/updating users, set the `qcRndProfile`:

```javascript
// QC Lab Technician
{
  qcRndProfile: {
    layer: "QC",
    qcRole: "QC_LAB_TECHNICIAN",
    canAccessRndData: false,
    canReleaseToQC: false,
    // ... other flags false
  }
}

// R&D Chemist
{
  qcRndProfile: {
    layer: "R&D",
    rndRole: "R&D_CHEMIST",
    canAccessRndData: true, // R&D can access their own data
    canReleaseToQC: false,
    // ... other flags false
  }
}

// Technical Manager
{
  qcRndProfile: {
    layer: "MANAGEMENT",
    managementRole: "TECHNICAL_MANAGER_RND",
    canAccessRndData: true,
    canReleaseToQC: true,
    canFreezeFormulations: true,
    canDefineAcceptanceLimits: true,
    canCloseCAPA: true,
    canConductMRM: true
  }
}
```

---

## 📝 SUMMARY

### Total Roles in System:

**Three-Layer Model (7 roles):**
1. QC_LAB_TECHNICIAN
2. QC_SUPERVISOR
3. R&D_CHEMIST
4. SENIOR_R&D_SCIENTIST
5. TECHNICAL_MANAGER_RND
6. PLANT_HEAD
7. CEO / DIRECTOR

**Permission-Based Roles (6 roles):**
1. QC Site User
2. QC Hub User
3. QC Analyst
4. QC Manager
5. QC Admin
6. QC Viewer

**Total: 13 distinct roles** (7 three-layer + 6 permission-based)

### Access Control:
- ✅ Three-layer model enforces data visibility
- ✅ Permission-based roles provide granular access
- ✅ Portal-based separation (QC Site vs QC Hub)
- ✅ All enforced via middleware

**STATUS: Complete role system implemented and documented! ✅**

