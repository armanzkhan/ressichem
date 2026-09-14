# QC Hub Roles - Quick Reference Guide

## 🎯 THREE-LAYER MODEL (Primary Access Control)

### Layer 1: QC (Execution & Compliance)
| Role | Code | Can See R&D? | Can Release to QC? | Can Close CAPA? | Can Conduct MRM? |
|------|------|--------------|-------------------|-----------------|------------------|
| QC Lab Technician | `QC_LAB_TECHNICIAN` | ❌ | ❌ | ❌ | ❌ |
| QC Supervisor | `QC_SUPERVISOR` | ❌ | ❌ | ❌ | ❌ |

### Layer 2: R&D (Innovation & Development)
| Role | Code | Can See QC? | Can Release to QC? | Can Close CAPA? | Can Conduct MRM? |
|------|------|-------------|-------------------|-----------------|------------------|
| R&D Chemist | `R&D_CHEMIST` | ❌ | ❌ | ❌ | ❌ |
| Senior R&D Scientist | `SENIOR_R&D_SCIENTIST` | ❌ | ❌ | ❌ | ❌ |

### Layer 3: Management (Governance & Approval)
| Role | Code | Can See All? | Can Release to QC? | Can Close CAPA? | Can Conduct MRM? |
|------|------|--------------|-------------------|-----------------|------------------|
| Technical Manager (R&D) | `TECHNICAL_MANAGER_RND` | ✅ | ✅ | ✅ | ✅ |
| Plant Head | `PLANT_HEAD` | ✅ | ✅ | ✅ | ✅ |
| CEO | `CEO` | ✅ | ✅ | ✅ | ✅ |
| Director | `DIRECTOR` | ✅ | ✅ | ✅ | ✅ |

---

## 🔐 PERMISSION-BASED ROLES

| Role | Portal Access | Can Approve? | Can Manage Users? |
|------|---------------|--------------|-------------------|
| QC Site User | QC Site only | ❌ | ❌ |
| QC Hub User | QC Hub only | ❌ | ❌ |
| QC Analyst | Both portals | ❌ | ❌ |
| QC Manager | Both portals | ✅ | ❌ |
| QC Admin | Both portals | ✅ | ✅ |
| QC Viewer | Both portals (read-only) | ❌ | ❌ |

---

## 📋 MODULE ACCESS BY LAYER

| Module | QC Layer | R&D Layer | Management |
|--------|----------|-----------|------------|
| Raw Materials | ✅ View/Manage | ✅ View/Select | ✅ Full |
| Formulations | ✅ QC-approved only | ✅ R&D only | ✅ Full + Approve |
| R&D Experiments | ❌ | ✅ Full | ✅ Full |
| Complaints | ✅ (QC Supervisor sees customer) | ❌ | ✅ Full |
| CAPA | ✅ Initiate | ✅ If assigned | ✅ Full + Close |
| MRM | ❌ | ❌ | ✅ Full |
| Reporting | ✅ QC reports | ✅ R&D reports | ✅ All reports |
| Raw Data Forms | ✅ Full | ❌ | ✅ Full |
| QC Plan | ✅ View | ✅ View | ✅ Full |

---

## 🚀 QUICK SETUP

### Assign Layer to User:
```javascript
// Example: QC Lab Technician
user.qcRndProfile = {
  layer: "QC",
  qcRole: "QC_LAB_TECHNICIAN",
  canAccessRndData: false,
  canReleaseToQC: false,
  canFreezeFormulations: false,
  canDefineAcceptanceLimits: false,
  canCloseCAPA: false,
  canConductMRM: false
};
```

### Assign Permission Role:
```javascript
// Example: QC Analyst
const qcAnalystRole = await Role.findOne({ name: "QC Analyst", company_id });
user.roles = [qcAnalystRole._id];
user.role = "QC Analyst";
```

---

## ✅ VERIFICATION

Check user's access:
```javascript
const { getUserLayer, canAccessRndData, canReleaseToQC } = require('./middleware/qcRndAccessMiddleware');

const layer = getUserLayer(user); // "QC" | "R&D" | "MANAGEMENT"
const canSeeRnd = canAccessRndData(user); // true/false
const canRelease = canReleaseToQC(user); // true/false
```

