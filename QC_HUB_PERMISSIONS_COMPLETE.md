# QC Hub System - Complete Permissions Documentation

## 📋 PERMISSIONS OVERVIEW

The QC Hub system uses a **permission-based access control** system where each permission grants access to specific functionality. Permissions are organized by module and action.

---

## 🔐 EXISTING PERMISSIONS (Currently Defined)

### Base Access
| Permission Key | Description |
|----------------|-------------|
| `qc.access` | **Required** - Access Quality Control module (base permission) |

### QC Tests Module
| Permission Key | Description |
|----------------|-------------|
| `qc.tests.read` | Read QC tests |
| `qc.tests.create` | Create QC tests |
| `qc.tests.update` | Update QC tests |
| `qc.tests.delete` | Delete/deactivate QC tests |

### QC Standards Module
| Permission Key | Description |
|----------------|-------------|
| `qc.standards.read` | Read QC standard criteria |
| `qc.standards.create` | Create QC standard criteria |
| `qc.standards.update` | Update QC standard criteria |
| `qc.standards.delete` | Delete/deactivate QC standard criteria |

### QC Results Module
| Permission Key | Description |
|----------------|-------------|
| `qc.results.read` | Read QC results |
| `qc.results.create` | Create QC results |
| `qc.results.update` | Update QC results |
| `qc.results.submit` | Submit QC results for approval |
| `qc.results.approve` | Approve/reject QC results |

### QC Exports Module
| Permission Key | Description |
|----------------|-------------|
| `qc.exports.read` | Export QC datasets (Power BI) |

### QC Hub Plan Module
| Permission Key | Description |
|----------------|-------------|
| `qc.hub.plan.read` | Read QC Hub plan (Dry Mortar) |
| `qc.hub.plan.update` | Create/update QC Hub plan (Dry Mortar) |

### QC Hub Forms Module
| Permission Key | Description |
|----------------|-------------|
| `qc.hub.forms.read` | Read QC Hub raw data forms |
| `qc.hub.forms.create` | Create QC Hub raw data forms |
| `qc.hub.forms.update` | Update QC Hub raw data forms |
| `qc.hub.forms.submit` | Submit QC Hub raw data forms |
| `qc.hub.forms.approve` | Approve/reject QC Hub raw data forms |
| `qc.hub.forms.export` | Export QC Hub raw data forms |

### QC Users Module
| Permission Key | Description |
|----------------|-------------|
| `qc.users.read` | Read QC users list |
| `qc.users.create` | Create QC users (Site/Hub) |
| `qc.users.update` | Update QC users |

---

## 🆕 NEW PERMISSIONS NEEDED (For SRS-Compliant Modules)

### Raw Materials Module
| Permission Key | Description |
|----------------|-------------|
| `qc.raw-materials.read` | Read raw materials |
| `qc.raw-materials.create` | Create raw materials |
| `qc.raw-materials.update` | Update raw materials |
| `qc.raw-materials.delete` | Delete/deactivate raw materials |
| `qc.raw-materials.batches.read` | Read raw material batches |
| `qc.raw-materials.batches.create` | Create raw material batches |
| `qc.raw-materials.batches.update` | Update raw material batches |

### Formulations Module
| Permission Key | Description |
|----------------|-------------|
| `qc.formulations.read` | Read formulations |
| `qc.formulations.create` | Create formulations |
| `qc.formulations.update` | Update formulations |
| `qc.formulations.version` | Create formulation versions |
| `qc.formulations.submit-to-qc` | Submit R&D formulation to QC |
| `qc.formulations.approve-for-qc` | Approve R&D formulation for QC (Management) |
| `qc.formulations.freeze` | Freeze formulations (Management) |
| `qc.formulations.bom` | Generate BOM |

### R&D Experiments Module
| Permission Key | Description |
|----------------|-------------|
| `rnd.experiments.read` | Read R&D experiments |
| `rnd.experiments.create` | Create R&D experiments |
| `rnd.experiments.update` | Update R&D experiments |
| `rnd.experiments.trials.create` | Add trials to experiments |
| `rnd.experiments.trials.update` | Update experiment trials |
| `rnd.experiments.compare` | Compare experiment trials |
| `rnd.experiments.complete` | Complete experiments |

### Electronic Signatures Module
| Permission Key | Description |
|----------------|-------------|
| `qc.signatures.create` | Create electronic signatures |
| `qc.signatures.read` | Read electronic signatures |
| `qc.signatures.verify` | Verify electronic signatures |

### Complaints Module
| Permission Key | Description |
|----------------|-------------|
| `qc.complaints.read` | Read complaints (QC & Management only) |
| `qc.complaints.create` | Create complaints (QC only) |
| `qc.complaints.update` | Update complaints |
| `qc.complaints.investigate` | Start complaint investigation |
| `qc.complaints.submit-review` | Submit complaint for management review |
| `qc.complaints.management-review` | Management review of complaints |
| `qc.complaints.resolve` | Resolve complaints |
| `qc.complaints.close` | Close complaints (Management) |

### CAPA Module
| Permission Key | Description |
|----------------|-------------|
| `qc.capa.read` | Read CAPAs |
| `qc.capa.create` | Create CAPAs (QC can initiate) |
| `qc.capa.update` | Update CAPAs |
| `qc.capa.root-cause` | Conduct root cause analysis |
| `qc.capa.submit-approval` | Submit CAPA for approval |
| `qc.capa.approve` | Approve CAPAs (Management) |
| `qc.capa.implement` | Start/update CAPA implementation |
| `qc.capa.verify` | Verify CAPA implementation |
| `qc.capa.close` | Close CAPAs (Management) |

### MRM Module
| Permission Key | Description |
|----------------|-------------|
| `qc.mrm.read` | Read MRMs (Management only) |
| `qc.mrm.create` | Create MRMs (Management only) |
| `qc.mrm.update` | Update MRMs (Management only) |
| `qc.mrm.pull-data` | Pull data for MRM (Management only) |
| `qc.mrm.complete` | Complete MRM (Management only) |
| `qc.mrm.approve` | Approve MRM (Management only) |

### Reporting Module
| Permission Key | Description |
|----------------|-------------|
| `qc.reporting.certificate` | Generate QC certificates |
| `qc.reporting.dashboard.performance` | View performance dashboard |
| `qc.reporting.dashboard.complaints` | View complaint dashboard |
| `qc.reporting.dashboard.capa` | View CAPA dashboard |
| `qc.reporting.en-compliance` | View EN compliance reports |
| `qc.reporting.export` | Export reports (Excel/CSV/PDF) |

### R&D Base Access
| Permission Key | Description |
|----------------|-------------|
| `rnd.access` | Access R&D module (base permission) |

### Management Base Access
| Permission Key | Description |
|----------------|-------------|
| `management.access` | Access Management functions (base permission) |

---

## 📊 PERMISSION SUMMARY

### Total Permissions: **60+**

**Existing (20):**
- Base: 1
- QC Tests: 4
- QC Standards: 4
- QC Results: 5
- QC Exports: 1
- QC Hub Plan: 2
- QC Hub Forms: 6
- QC Users: 3

**New SRS Modules (40+):**
- Raw Materials: 7
- Formulations: 8
- R&D Experiments: 7
- Electronic Signatures: 3
- Complaints: 8
- CAPA: 9
- MRM: 6
- Reporting: 6
- Base Access: 3

---

## 🔗 PERMISSION GROUPS

### Quality Control Group
Contains all `qc.*` permissions (existing + new)

### R&D Group
Contains all `rnd.*` permissions

### Management Group
Contains all `management.*` permissions

---

## 🎯 PERMISSION USAGE IN ROUTES

### Example Route Protection:
```javascript
router.use(authMiddleware); // Authentication required
router.use(permissionMiddleware(["qc.access"])); // Base QC access required
router.get("/", permissionMiddleware(["qc.results.read"]), controller.list);
router.post("/", permissionMiddleware(["qc.results.create"]), controller.create);
router.post("/:id/approve", permissionMiddleware(["qc.results.approve"]), controller.approve);
```

---

## ✅ PERMISSION CHECKLIST

### Currently Implemented:
- [x] Base QC permissions
- [x] QC Tests permissions
- [x] QC Standards permissions
- [x] QC Results permissions
- [x] QC Exports permissions
- [x] QC Hub Plan permissions
- [x] QC Hub Forms permissions
- [x] QC Users permissions

### Need to Add:
- [ ] Raw Materials permissions
- [ ] Formulations permissions
- [ ] R&D Experiments permissions
- [ ] Electronic Signatures permissions
- [ ] Complaints permissions
- [ ] CAPA permissions
- [ ] MRM permissions
- [ ] Reporting permissions
- [ ] R&D base access
- [ ] Management base access

---

## 🚀 SETUP INSTRUCTIONS

### 1. Run Permission Setup Script
```bash
# Existing permissions
node backend/scripts/migrations/setup-qc-permissions.js RESSICHEM

# New SRS permissions (to be created)
node backend/scripts/migrations/setup-qc-srs-permissions.js RESSICHEM
```

### 2. Assign Permissions to Roles
Permissions are assigned to roles, and roles are assigned to users. Users can also have direct permissions.

---

## 📝 NOTES

- All routes require `qc.access` as base permission
- R&D routes require `rnd.access` as base permission
- Management routes require `management.access` as base permission
- Permissions are checked via `permissionMiddleware`
- Three-layer model (QC/R&D/Management) provides additional access control on top of permissions

